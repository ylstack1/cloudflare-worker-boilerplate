#!/bin/bash
# EDGE-MANIFEST Example Test Script
# Usage: ./test-example.sh <example-number>
# Example: ./test-example.sh 1

set -e

EXAMPLE_NUM=${1:-1}
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES_DIR="$PROJECT_ROOT/examples"
STARTER_DIR="$PROJECT_ROOT/packages/@edge-manifest/starter"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Choose example based on argument
case $EXAMPLE_NUM in
  1)
    EXAMPLE_FILE="config-example-1-todo.manifest.json"
    EXAMPLE_NAME="Todo App"
    ENTITY_NAME="TodoList"
    ;;
  2)
    EXAMPLE_FILE="config-example-2-blog.manifest.json"
    EXAMPLE_NAME="Blog Platform"
    ENTITY_NAME="Author"
    ;;
  3)
    EXAMPLE_FILE="config-example-3-ecommerce.manifest.json"
    EXAMPLE_NAME="E-Commerce Store"
    ENTITY_NAME="Store"
    ;;
  *)
    echo -e "${RED}Invalid example number. Use 1, 2, or 3${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  EDGE-MANIFEST Example Test: $EXAMPLE_NAME${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Validate manifest exists
if [ ! -f "$EXAMPLES_DIR/$EXAMPLE_FILE" ]; then
  echo -e "${RED}✗ Example file not found: $EXAMPLE_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Found example: $EXAMPLE_FILE"

# Validate JSON
if jq empty "$EXAMPLES_DIR/$EXAMPLE_FILE" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Valid JSON"
else
  echo -e "${RED}✗${NC} Invalid JSON"
  exit 1
fi

# Read manifest content
MANIFEST_CONTENT=$(cat "$EXAMPLES_DIR/$EXAMPLE_FILE")
echo -e "${GREEN}✓${NC} Manifest loaded successfully"

# Show entity count
ENTITY_COUNT=$(echo "$MANIFEST_CONTENT" | jq '.entities | length')
echo -e "${BLUE}ℹ${NC} Entities: $ENTITY_COUNT"
echo "$MANIFEST_CONTENT" | jq -r '.entities[].name' | sed 's/^/  - /'

echo ""
echo -e "${YELLOW}Note:${NC} Full API testing requires a running server."
echo -e "${YELLOW}      This validation confirms the manifest is valid and ready to use.${NC}"
echo ""

# Validate manifest against schema
echo -e "${BLUE}Validating manifest structure...${NC}"

# Check required fields
REQUIRED_FIELDS=("id" "name" "version" "entities")
for field in "${REQUIRED_FIELDS[@]}"; do
  if echo "$MANIFEST_CONTENT" | jq -e ".$field" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Field present: $field"
  else
    echo -e "${RED}✗${NC} Missing required field: $field"
    exit 1
  fi
done

# Check each entity has required fields
echo ""
echo -e "${BLUE}Validating entities...${NC}"
ENTITY_NAMES=$(echo "$MANIFEST_CONTENT" | jq -r '.entities[].name')
for entity in $ENTITY_NAMES; do
  echo -e "${BLUE}  Checking: $entity${NC}"
  
  # Check for fields array
  FIELD_COUNT=$(echo "$MANIFEST_CONTENT" | jq ".entities[] | select(.name==\"$entity\") | .fields | length")
  if [ "$FIELD_COUNT" -gt 0 ]; then
    echo -e "    ${GREEN}✓${NC} Has $FIELD_COUNT fields"
  else
    echo -e "    ${RED}✗${NC} No fields defined"
    exit 1
  fi
  
  # List field names and types
  echo "$MANIFEST_CONTENT" | jq -r ".entities[] | select(.name==\"$entity\") | .fields[] | \"    - \" + .name + \" (\" + .kind + \")\""
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  VALIDATION COMPLETE ✓${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Copy manifest to starter:"
echo -e "     ${YELLOW}cp $EXAMPLES_DIR/$EXAMPLE_FILE $STARTER_DIR/manifest.json${NC}"
echo ""
echo -e "  2. Start dev server (in another terminal):"
echo -e "     ${YELLOW}cd $STARTER_DIR && EDGE_MANIFEST=\"\$(cat manifest.json)\" bun run dev${NC}"
echo ""
echo -e "  3. Test API endpoints:"
echo -e "     ${YELLOW}curl http://localhost:7860/health${NC}"
echo ""
