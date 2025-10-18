/*
 * Author: Cascade
 * Date: 2025-10-17 and 21:06 UTC
 * PURPOSE: Test script to trigger a debate stream between GPT-5 Mini and GPT-5 Nano, monitoring the full SSE flow
 * SRP/DRY check: Pass - Focused testing script for debate streaming validation
 */

const BASE_URL = 'http://localhost:5000';

async function testDebateStream() {
  console.log('🎭 Starting Debate Stream Test: GPT-5 Mini vs GPT-5 Nano\n');

  // Step 1: Initialize the stream
  console.log('📝 Step 1: Initializing debate stream...');
  const initPayload = {
    modelId: 'gpt-5-mini-2025-08-07',
    topic: 'Artificial intelligence will ultimately benefit humanity more than harm it',
    role: 'AFFIRMATIVE',
    intensity: 5,
    opponentMessage: null,
    previousResponseId: null,
    turnNumber: 1,
    model1Id: 'gpt-5-mini-2025-08-07',
    model2Id: 'gpt-5-nano-2025-08-07',
    reasoningEffort: 'medium',
    reasoningSummary: 'auto',
    reasoningVerbosity: 'medium',
    temperature: 0.7,
    maxTokens: 4096
  };

  console.log('   Payload:', JSON.stringify(initPayload, null, 2));

  try {
    const initResponse = await fetch(`${BASE_URL}/api/debate/stream/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initPayload)
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      console.error('❌ Init failed:', error);
      return;
    }

    const initData = await initResponse.json();
    console.log('✅ Stream initialized:', initData);
    console.log('   Session ID:', initData.sessionId);
    console.log('   Task ID:', initData.taskId);
    console.log('   Debate Session ID:', initData.debateSessionId);

    // Step 2: Connect to SSE stream
    console.log('\n📡 Step 2: Connecting to SSE stream...');
    const streamUrl = `${BASE_URL}/api/debate/stream/${encodeURIComponent(initData.taskId)}/${encodeURIComponent(initData.modelKey)}/${encodeURIComponent(initData.sessionId)}`;
    console.log('   Stream URL:', streamUrl);

    // Note: EventSource doesn't work in Node.js, but we can use fetch with streaming
    console.log('\n⚠️  EventSource not available in Node.js');
    console.log('   Please open browser console and run:');
    console.log(`
const eventSource = new EventSource('${streamUrl}');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('[SSE]', data.type, data);
};
eventSource.onerror = (error) => {
  console.error('[SSE Error]', error);
};
    `.trim());

    // Alternative: Use fetch with streaming (for server-side testing)
    console.log('\n🔄 Attempting fetch-based streaming...');
    const streamResponse = await fetch(streamUrl);
    
    if (!streamResponse.ok) {
      console.error('❌ Stream connection failed:', await streamResponse.text());
      return;
    }

    console.log('✅ Stream connection established');
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();

    let eventBuffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('\n✅ Stream completed');
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      eventBuffer += chunk;

      // Process complete SSE events (ending with \n\n)
      const events = eventBuffer.split('\n\n');
      eventBuffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        // Parse SSE format: "data: {...}"
        const lines = event.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              chunkCount++;
              
              if (parsed.type === 'reasoning') {
                console.log(`[${chunkCount}] 🧠 Reasoning: ${parsed.delta?.substring(0, 50)}...`);
              } else if (parsed.type === 'text') {
                console.log(`[${chunkCount}] 💬 Content: ${parsed.delta?.substring(0, 50)}...`);
              } else if (parsed.type === 'status') {
                console.log(`[${chunkCount}] 📊 Status: ${parsed.phase} - ${parsed.message || ''}`);
              } else if (parsed.type === 'complete') {
                console.log(`[${chunkCount}] ✅ Complete:`, {
                  responseId: parsed.responseId,
                  tokenUsage: parsed.tokenUsage,
                  cost: parsed.cost
                });
              } else if (parsed.type === 'error') {
                console.log(`[${chunkCount}] ❌ Error:`, parsed.message);
              } else {
                console.log(`[${chunkCount}] ⚙️  ${parsed.type}:`, parsed);
              }
            } catch (e) {
              console.log('   Raw data:', data.substring(0, 100));
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDebateStream().catch(console.error);
