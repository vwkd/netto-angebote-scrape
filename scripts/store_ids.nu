#!/usr/bin/env nu

# Find all Netto store IDs that are indexed by Wayback Machine
http get 'https://web.archive.org/cdx/search/cdx?url=https://www.netto-online.de/filialen/*&collapse=urlkey&filter=mimetype:text/html&filter=statuscode:200'
  | lines
  | each { split column ' '
    | get column3.0
    | url parse
    | get path
    | split row '/'
    | each { try { into int } catch { null } } }
  | each { if ($in | length) == 1 { $in.0 } else { error make { msg: $'Expected list with one item, but got ($in)' } } }
  | uniq
  | sort
  | save store_ids.txt
