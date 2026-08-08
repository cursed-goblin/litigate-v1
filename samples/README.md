# Sample contracts

Six documents for testing and demos. Each one is written to trigger a different
mix of playbook rules, so the dashboard shows a spread of risk scores instead of
six identical high-risk rows.

| File | Type | Expected band |
| --- | --- | --- |
| mutual-nda-northwind.txt | Mutual NDA | low |
| dpa-cloudspan-processor.txt | Data processing addendum | medium |
| sow-consulting-halcyon.txt | Statement of work | medium |
| saas-subscription-brightledger.txt | SaaS subscription terms | medium to high |
| reseller-agreement-orionpath.txt | Reseller and channel partner | high |
| msa-vendor-vertexgrid.txt | Master services agreement | high |

All six are plain text, which the analyser accepts directly. To test the Google
Drive import, upload two or three of these to a Drive folder first, then use
Import from Drive. Use these rather than MSA-2023-0147.pdf so a new filename
proves the import path end to end.

Every company, person, and number in these files is invented.
