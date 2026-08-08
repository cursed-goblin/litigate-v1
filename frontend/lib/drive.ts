"use client"

import { supabase } from "./supabase"

// drive.file, deliberately, not drive.readonly. This scope grants access to
// the individual files the owner selects in the Picker and nothing else, so
// the honest answer to "can you read our whole Drive?" is no. Widening this
// would also drag the app into Google's restricted scope review.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

// The Cloud project number. Optional, but it is what lets a picked file be
// granted to this app under drive.file.
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || ""

export const driveConfigured = Boolean(API_KEY)

const PICKER_SRC = "https://apis.google.com/js/api.js"
const FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files/"

const GOOGLE_DOC = "application/vnd.google-apps.document"
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

// Mirrors what the extractor can actually read. Filtering here means the
// owner never picks a file that fails on the server.
const IMPORTABLE = ["application/pdf", DOCX, "text/plain", "text/markdown", GOOGLE_DOC].join(
  ",",
)

const EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  [DOCX]: ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md",
}

export type DriveFile = {
  id: string
  name: string
  mimeType: string
}

/** The Google token from the Supabase session, or "" when Drive is unconnected. */
export async function driveToken(): Promise<string> {
  if (!supabase) {
    return ""
  }
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.provider_token ?? ""
  } catch {
    return ""
  }
}

/**
 * Re-runs Google sign in asking for the Drive scope on top. This redirects
 * away and back, so anything unsaved is lost: call it from an explicit
 * action, never automatically.
 */
export async function connectDrive(): Promise<void> {
  if (!supabase) {
    throw new Error("sign in is not configured")
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: DRIVE_SCOPE,
      redirectTo: window.location.origin,
      // Without this, Google silently reuses the earlier consent and returns
      // a token that lacks the Drive scope.
      queryParams: { prompt: "consent" },
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

let loader: Promise<any> | null = null

function loadPicker(): Promise<any> {
  if (loader) {
    return loader
  }

  loader = new Promise((resolve, reject) => {
    const host = window as any

    const ready = () => {
      host.gapi.load("picker", {
        callback: () => resolve(host.google.picker),
        onerror: () => {
          loader = null
          reject(new Error("the Google Picker could not be loaded"))
        },
      })
    }

    if (host.gapi?.load) {
      ready()
      return
    }

    const tag = document.createElement("script")
    tag.src = PICKER_SRC
    tag.async = true
    tag.onload = ready
    tag.onerror = () => {
      loader = null
      reject(new Error("the Google Picker could not be reached"))
    }
    document.head.appendChild(tag)
  })

  return loader
}

/**
 * Opens the Google Picker and resolves with what the owner chose. An empty
 * array means they cancelled, which is not an error.
 */
export async function pickFiles(token: string): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error("NEXT_PUBLIC_GOOGLE_API_KEY is not set on this deployment")
  }

  const picker = await loadPicker()

  return new Promise<DriveFile[]>((resolve, reject) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
    view.setMimeTypes(IMPORTABLE)
    view.setIncludeFolders(true)
    view.setSelectFolderEnabled(false)

    const builder = new picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setTitle("Choose contracts, or one index of links")
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED) {
          resolve(
            (data.docs ?? []).map((doc: any) => ({
              id: String(doc.id),
              name: String(doc.name ?? "contract"),
              mimeType: String(doc.mimeType ?? ""),
            })),
          )
          return
        }
        if (data.action === picker.Action.CANCEL) {
          resolve([])
        }
      })

    if (APP_ID) {
      builder.setAppId(APP_ID)
    }

    try {
      builder.build().setVisible(true)
    } catch (cause) {
      reject(
        cause instanceof Error ? cause : new Error("the Google Picker failed to open"),
      )
    }
  })
}

function filenameFor(file: DriveFile): string {
  if (file.mimeType === GOOGLE_DOC) {
    return file.name + ".txt"
  }

  const suffix = EXTENSION[file.mimeType]
  if (!suffix || file.name.toLowerCase().endsWith(suffix)) {
    return file.name
  }
  return file.name + suffix
}

/**
 * Downloads one picked file into the browser as a File, so it can go through
 * the same upload path as a file chosen from disk. Native Google Docs have no
 * bytes to download and are exported as plain text instead.
 */
export async function downloadFile(file: DriveFile, token: string): Promise<File> {
  const native = file.mimeType === GOOGLE_DOC
  const url = native
    ? FILES_ENDPOINT + file.id + "/export?mimeType=text/plain"
    : FILES_ENDPOINT + file.id + "?alt=media"

  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Google refused the download. Reconnect Google Drive and grant access when asked.",
    )
  }
  if (!response.ok) {
    throw new Error(
      file.name + " could not be downloaded from Drive (" + response.status + ")",
    )
  }

  const blob = await response.blob()
  return new File([blob], filenameFor(file), {
    type: blob.type || file.mimeType,
  })
}

// Index files -------------------------------------------------------------
//
// Most owners keep their policies as Google Docs and circulate view links. An
// index is one text file or Doc holding those links, so a single pick brings
// in the whole library instead of thirty separate ones.

const INDEXABLE = [GOOGLE_DOC, "text/plain", "text/markdown"]

/** True when a picked file could be a list of links rather than a contract. */
export function canIndex(mimeType: string): boolean {
  return INDEXABLE.includes(mimeType)
}

const ID_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"

// Deliberately free of regular expressions. A Drive id is just a long run of
// url safe characters, which is cheaper to check by hand than to describe
// with a pattern, and impossible to get subtly wrong.
function isDriveId(value: string): boolean {
  if (value.length < 20) {
    return false
  }
  for (const character of value) {
    if (!ID_CHARS.includes(character)) {
      return false
    }
  }
  return true
}

const STOP = ["/", "?", "&", "#", "<", ">", ",", ")", "]"]

function upToDelimiter(value: string): string {
  let end = value.length
  for (const mark of STOP) {
    const at = value.indexOf(mark)
    if (at >= 0 && at < end) {
      end = at
    }
  }
  return value.slice(0, end)
}

function flatten(text: string): string {
  return text.split("\n").join(" ").split("\r").join(" ").split("\t").join(" ")
}

// Handles the three shapes a Drive link actually arrives in: the modern
// /file/d/ID/view and /document/d/ID/edit paths, the older open?id=ID query,
// and a bare id pasted on its own.
function idFrom(token: string): string {
  const viaPath = token.indexOf("/d/")
  if (viaPath >= 0) {
    const candidate = upToDelimiter(token.slice(viaPath + 3))
    return isDriveId(candidate) ? candidate : ""
  }

  const viaQuery = token.indexOf("id=")
  if (viaQuery >= 0) {
    const candidate = upToDelimiter(token.slice(viaQuery + 3))
    return isDriveId(candidate) ? candidate : ""
  }

  return isDriveId(token) ? token : ""
}

/** Every distinct Drive id mentioned in a block of text, in the order found. */
export function driveIdsFrom(text: string): string[] {
  const seen = new Set<string>()
  const ids: string[] = []

  for (const token of flatten(text).split(" ")) {
    const id = idFrom(token.trim())
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  return ids
}

/**
 * Separates a list of links from a contract that merely mentions one. An
 * index is almost entirely links; a real document is almost entirely prose,
 * so counting the words that are neither a link nor an id tells them apart
 * without asking the owner to declare which kind of file they picked.
 */
export function looksLikeIndex(text: string, ids: string[]): boolean {
  if (!ids.length) {
    return false
  }

  const prose = flatten(text)
    .split(" ")
    .filter((word) => {
      const value = word.trim()
      return (
        value.length > 0 &&
        !value.includes("http") &&
        !value.includes("drive.google") &&
        !isDriveId(value)
      )
    })

  return prose.length < 250
}

const SHARE_HINT =
  " Open it in Drive, choose Share, and set General access to Anyone with the link as Viewer."

/**
 * Metadata for a file we know only by id. A link shared file can be read with
 * the browser API key alone, and that is the whole reason an index file works:
 * drive.file only covers files the owner picked in person, so the signed in
 * token cannot reach a document we found inside a list. The token is still
 * tried afterwards, for the case where that file was picked earlier.
 */
async function metadataFor(id: string, token: string): Promise<DriveFile> {
  const fields = "?fields=id,name,mimeType&supportsAllDrives=true"
  let response = await fetch(FILES_ENDPOINT + id + fields + "&key=" + API_KEY)

  if (!response.ok && token) {
    response = await fetch(FILES_ENDPOINT + id + fields, {
      headers: { Authorization: "Bearer " + token },
    })
  }

  if (!response.ok) {
    throw new Error(
      "A linked document could not be opened (" + response.status + ")." + SHARE_HINT,
    )
  }

  const body = await response.json()
  return {
    id,
    name: String(body.name ?? "document"),
    mimeType: String(body.mimeType ?? ""),
  }
}

/** Downloads a link shared file by id, for documents listed in an index. */
export async function downloadById(id: string, token: string): Promise<File> {
  if (!API_KEY) {
    throw new Error("NEXT_PUBLIC_GOOGLE_API_KEY is not set on this deployment")
  }

  const file = await metadataFor(id, token)
  const native = file.mimeType === GOOGLE_DOC
  const path = native
    ? file.id + "/export?mimeType=text/plain&key=" + API_KEY
    : file.id + "?alt=media&key=" + API_KEY

  let response = await fetch(FILES_ENDPOINT + path)

  if (!response.ok && token) {
    const authed = native
      ? file.id + "/export?mimeType=text/plain"
      : file.id + "?alt=media"
    response = await fetch(FILES_ENDPOINT + authed, {
      headers: { Authorization: "Bearer " + token },
    })
  }

  if (!response.ok) {
    throw new Error(
      file.name + " could not be downloaded (" + response.status + ")." + SHARE_HINT,
    )
  }

  const blob = await response.blob()
  return new File([blob], filenameFor(file), {
    type: blob.type || file.mimeType,
  })
}
