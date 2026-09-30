# Shared guide

Encrypted static document viewer for GitHub Pages. The document opens only with the complete sharing URL.

The AES-256-GCM key is held in the URL fragment and is never committed. Only encrypted document data is stored in this repository. Possession of the complete URL permits viewing and forwarding. No analytics are included. Search engines are instructed not to index the viewer.

Publish from the main branch root. To update content, encrypt the participant HTML and PDF with a fresh IV and the existing locally retained key. Never commit plaintext documents or the sharing URL.
