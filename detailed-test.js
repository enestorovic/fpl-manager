// Detailed test script to inspect FPL API responses
async function detailedTest() {
  try {
    console.log('=== DETAILED FPL API TEST ===\n');
    
    // Test bootstrap API
    console.log('1. Testing Bootstrap API...');
    const bootstrapResponse = await fetch('http://localhost:3002/api/fpl/bootstrap');
    const bootstrapData = await bootstrapResponse.json();
    
    console.log('Bootstrap data structure:');
    console.log(`- Events (gameweeks): ${bootstrapData.events?.length || 0}`);
    console.log(`- Teams (PL clubs): ${bootstrapData.teams?.length || 0}`);
    console.log(`- Elements (players): ${bootstrapData.elements?.length || 0}`);
    
    const currentEvent = bootstrapData.events?.find(event => event.is_current);
    const nextEvent = bootstrapData.events?.find(event => event.is_next);
    
    console.log(`\nCurrent Event: ${currentEvent ? `GW${currentEvent.id} - ${currentEvent.name}` : 'None'}`);
    console.log(`Next Event: ${nextEvent ? `GW${nextEvent.id} - ${nextEvent.name}` : 'None'}`);
    console.log(`Season finished: ${bootstrapData.events?.every(e => e.finished) || false}`);
    
    // Test league standings API
    console.log('\n2. Testing League Standings API...');
    const leagueResponse = await fetch('http://localhost:3002/api/fpl/leagues/66185/standings');
    const leagueData = await leagueResponse.json();
    
    console.log('League data structure:');
    console.log(`- League: ${leagueData.league?.name || 'N/A'} (ID: ${leagueData.league?.id || 'N/A'})`);
    console.log(`- Admin entry: ${leagueData.league?.admin_entry || 'N/A'}`);
    console.log(`- Created: ${leagueData.league?.created || 'N/A'}`);
    console.log(`- Standing entries: ${leagueData.standings?.results?.length || 0}`);
    console.log(`- New entries: ${leagueData.new_entries?.results?.length || 0}`);
    
    if (leagueData.standings?.results?.length > 0) {
      const firstTeam = leagueData.standings.results[0];
      console.log(`\nFirst team sample:`, {
        id: firstTeam.entry,
        name: firstTeam.entry_name,
        player: firstTeam.player_name,
        total: firstTeam.total,
        last_rank: firstTeam.last_rank,
        rank: firstTeam.rank
      });
    }
    
    if (leagueData.new_entries?.results?.length > 0) {
      const firstNewEntry = leagueData.new_entries.results[0];
      console.log(`\nFirst new entry sample:`, {
        id: firstNewEntry.entry,
        name: firstNewEntry.entry_name,
        player: firstNewEntry.player_name,
        joined_time: firstNewEntry.joined_time
      });
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error.message);
  }
}

detailedTest();