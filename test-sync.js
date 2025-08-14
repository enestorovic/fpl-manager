// Simple test script to test the sync functionality
const { execSync } = require('child_process');

async function testSync() {
  try {
    console.log('Testing FPL sync...');
    
    // Test bootstrap API
    const response = await fetch('http://localhost:3002/api/fpl/bootstrap');
    if (!response.ok) {
      throw new Error(`Bootstrap API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const currentEvent = data.events?.find(event => event.is_current);
    
    console.log('✅ Bootstrap API working');
    console.log(`Current event: ${currentEvent?.id || 'Not found'} - ${currentEvent?.name || 'N/A'}`);
    console.log(`Current event finished: ${currentEvent?.finished || false}`);
    console.log(`Is current: ${currentEvent?.is_current || false}`);
    
    // Test league standings API  
    const leagueResponse = await fetch('http://localhost:3002/api/fpl/leagues/66185/standings');
    if (!leagueResponse.ok) {
      throw new Error(`League API failed: ${leagueResponse.status}`);
    }
    
    const leagueData = await leagueResponse.json();
    console.log('✅ League standings API working');
    console.log(`Teams in standings: ${leagueData.standings?.results?.length || 0}`);
    console.log(`New entries: ${leagueData.new_entries?.results?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSync();