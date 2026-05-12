#!/bin/bash

echo "=== Step 1: Get Current Block Number ==="
BLOCK_RESPONSE=$(curl -s -X POST \
  https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
echo "Full response: $BLOCK_RESPONSE"

# Extract hex block number
HEX_BLOCK=$(echo "$BLOCK_RESPONSE" | grep -o '"result":"0x[0-9a-f]*' | head -1 | cut -d'"' -f4)
CURRENT_BLOCK=$((HEX_BLOCK))
echo "Current Block (Decimal): $CURRENT_BLOCK"
echo "Current Block (Hex): $HEX_BLOCK"

echo -e "\n=== Step 2: Get Block Timestamp to Verify Recency ==="
BLOCK_DETAIL=$(curl -s -X POST \
  https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBlockByNumber\",\"params\":[\"$HEX_BLOCK\",false],\"id\":1}")
echo "Block details response (first 500 chars): ${BLOCK_DETAIL:0:500}"

# Extract timestamp
TIMESTAMP_HEX=$(echo "$BLOCK_DETAIL" | grep -o '"timestamp":"0x[0-9a-f]*' | head -1 | cut -d'"' -f4)
TIMESTAMP=$((TIMESTAMP_HEX))
CURRENT_TIME=$(date +%s)
TIME_DIFF=$((CURRENT_TIME - TIMESTAMP))
echo "Block Timestamp: $TIMESTAMP ($(date -d @$TIMESTAMP '+%Y-%m-%d %H:%M:%S %Z'))"
echo "Current Time: $CURRENT_TIME ($(date -d @$CURRENT_TIME '+%Y-%m-%d %H:%M:%S %Z'))"
echo "Age of Block: $TIME_DIFF seconds"

if [ $TIME_DIFF -le 180 ]; then
  echo "✓ Block is recent (within 3 minutes)"
else
  echo "✗ Block is older than 3 minutes"
fi

echo -e "\n=== Step 3: Query Swap Events in Last 2000 Blocks ==="
FROM_BLOCK=$((CURRENT_BLOCK - 2000))
FROM_BLOCK_HEX=$(printf "0x%x" $FROM_BLOCK)
TO_BLOCK_HEX=$HEX_BLOCK

echo "Querying from block $FROM_BLOCK ($FROM_BLOCK_HEX) to block $CURRENT_BLOCK ($TO_BLOCK_HEX)"
echo "Address: 0x539e2da338ca3ae9b5fedc6d102978a741b641cf"
echo "Topic: 0xd78ad95fa46890699f838e5e6610ccefd69681e626e14fb97639e31fa048ac44 (Uniswap V2 Swap event)"

LOGS_RESPONSE=$(curl -s -X POST \
  https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"fromBlock\":\"$FROM_BLOCK_HEX\",\"toBlock\":\"$TO_BLOCK_HEX\",\"address\":\"0x539e2da338ca3ae9b5fedc6d102978a741b641cf\",\"topics\":[\"0xd78ad95fa46890699f838e5e6610ccefd69681e626e14fb97639e31fa048ac44\"]}],\"id\":1}")

echo "Logs response: $LOGS_RESPONSE"

# Check if there are any results
if echo "$LOGS_RESPONSE" | grep -q '"result":\[\]'; then
  echo "✗ No Swap events found in the last 2000 blocks"
elif echo "$LOGS_RESPONSE" | grep -q '"result":\[{'; then
  LOG_COUNT=$(echo "$LOGS_RESPONSE" | grep -o '"logIndex"' | wc -l)
  echo "✓ Found $LOG_COUNT Swap events in the last 2000 blocks"
else
  echo "? Unable to determine event count from response"
fi

echo -e "\n=== Summary ==="
echo "Current Block: $CURRENT_BLOCK"
echo "Block Age: $TIME_DIFF seconds (Recent: $([ $TIME_DIFF -le 180 ] && echo 'YES' || echo 'NO'))"
echo "Query Range: $FROM_BLOCK - $CURRENT_BLOCK (2000 blocks)"
echo "Pair Address: 0x539e2da338ca3ae9b5fedc6d102978a741b641cf"
