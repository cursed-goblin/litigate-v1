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
      .setTitle("Choose contracts to analyse")
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
