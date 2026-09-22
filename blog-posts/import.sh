#!/usr/bin/env bash
# Creates each post as a WordPress draft with its slug and Rank Math SEO fields.
# Run on the server from the WordPress root, with this folder copied alongside:
#   bash blog-posts/import.sh            # creates drafts
#   STATUS=publish bash blog-posts/import.sh
# The posts link to each other, so publish them together.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
STATUS="${STATUS:-draft}"
WP="wp --allow-root"

# slug | post title | SEO title | meta description | focus keyword
while IFS='|' read -r slug title seo_title desc focus; do
  [ -z "$slug" ] && continue
  if $WP post list --post_type=post --name="$slug" --post_status=any --field=ID | grep -q .; then
    echo "skip  $slug (already exists)"; continue
  fi
  meta=$(printf '{"rank_math_title":"%s","rank_math_description":"%s","rank_math_focus_keyword":"%s"}' \
    "$seo_title" "$desc" "$focus")
  id=$($WP post create "$DIR/$slug.html" --post_type=post --post_status="$STATUS" \
    --post_name="$slug" --post_title="$title" --post_excerpt="$desc" \
    --meta_input="$meta" --porcelain)
  echo "made  $slug (ID $id, $STATUS)"
done <<'EOF'
dsip-research-overview|DSIP for Research: Structure, History, and the Missing Receptor|DSIP Peptide (Delta Sleep-Inducing Peptide): Research Overview|DSIP is a 9-residue neuropeptide with no confirmed receptor. Sequence, history, handling, and how research-grade DSIP is verified.|dsip peptide,delta sleep inducing peptide
thymosin-alpha-1-research-overview|Thymosin Alpha 1 for Research: Structure, Origin, and How It Differs From TB-500|Thymosin Alpha 1 Peptide: Research Overview & vs TB-500|Thymosin Alpha 1 is a 28-residue acetylated peptide, unrelated to TB-500 despite the name. Structure, origin, handling, and verification.|thymosin alpha 1,thymosin alpha 1 peptide,thymalfasin
ghrp-2-vs-ghrp-6-research-comparison|GHRP-2 vs GHRP-6: Comparing the Original Growth Hormone Releasing Peptides|GHRP-2 vs GHRP-6: Structure, Receptor & Key Differences|GHRP-2 and GHRP-6 compared: sequences, the ghrelin receptor, potency and selectivity differences, handling, and verification.|ghrp-2 vs ghrp-6,ghrp-2,ghrp-6
oxytocin-peptide-research-overview|Oxytocin for Research: The First Synthesized Peptide Hormone, Structure, and Stability|Oxytocin Peptide: Structure, Vasopressin Comparison & Stability|Oxytocin is a 9-residue cyclic peptide and the first hormone ever synthesized. Structure, vasopressin comparison, heat sensitivity, verification.|oxytocin peptide,oxytocin
glutathione-peptide-research-overview|Glutathione for Research: The Gamma-Linked Tripeptide, GSH vs GSSG, and Handling|Glutathione Peptide: GSH vs GSSG, Structure & Handling|Glutathione is a gamma-linked tripeptide central to redox research. Structure, reduced vs oxidized forms, oxidation-safe handling, verification.|glutathione peptide,glutathione
how-to-store-research-peptides|How to Store Research Peptides: Lyophilized and Reconstituted|How to Store Peptides: Lyophilized & Reconstituted Guide|How to store lyophilized and reconstituted peptides: temperatures, moisture, light, freeze-thaw, how long peptides last, and signs of degradation.|how to store peptides,peptide storage,lyophilized peptide
EOF
