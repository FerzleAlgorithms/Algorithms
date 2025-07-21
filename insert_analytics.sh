#!/bin/bash

# Your GA4 Analytics code
read -r -d '' ANALYTICS_CODE <<'EOF'
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-DQ5LVZVFDC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-DQ5LVZVFDC');
</script>
EOF

# Change to your HTML root directory
SITE_DIR="Content"

# Process all .html files recursively
find "$SITE_DIR" -type f -iname "*.html" | while read -r file; do
    # Check if the tracking code is already present (looks for your tag ID)
    if ! grep -q "G-DQ5LVZVFDC" "$file"; then
        # Insert the code before the closing </head>
        # Use a temporary file to avoid issues with special chars
        awk -v code="$ANALYTICS_CODE" '
            /<\/head>/ && !x { print code; x=1 }
            { print }
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        echo "Added Analytics code to $file"
    else
        echo "Analytics code already present in $file"
    fi
done
