// Test the full sync process

async function testFullSync() {
  try {
    console.log('🚀 Testing full sync process...\n');

    // Step 1: Test Bootstrap API
    console.log('1️⃣ Testing Bootstrap API...');
    const bootstrapResponse = await fetch('http://localhost:3001/api/fpl/bootstrap');
    if (!bootstrapResponse.ok) {
      throw new Error(`Bootstrap API failed: ${bootstrapResponse.status}`);
    }
    const bootstrapData = await bootstrapResponse.json();
    const currentEvent = bootstrapData.events?.find(event => event.is_current);
    console.log(`   ✅ Current Event: ${currentEvent?.id || 'None'} - ${currentEvent?.name || 'Season not started'}`);
    console.log(`   ✅ Total Events: ${bootstrapData.events?.length || 0}`);

    // Step 2: Test League Standings API
    console.log('\n2️⃣ Testing League Standings API...');
    const leagueResponse = await fetch('http://localhost:3001/api/fpl/leagues/66185/standings');
    if (!leagueResponse.ok) {
      throw new Error(`League API failed: ${leagueResponse.status}`);
    }
    const leagueData = await leagueResponse.json();
    console.log(`   ✅ Teams in standings: ${leagueData.standings?.results?.length || 0}`);
    console.log(`   ✅ New entries (not yet started): ${leagueData.new_entries?.results?.length || 0}`);
    console.log(`   ✅ League: ${leagueData.league?.name || 'Unknown'}`);

    // Step 3: Show what sync will do
    console.log('\n3️⃣ Sync Preview:');
    const teamsToSync = leagueData.standings?.results?.length > 0 
      ? leagueData.standings.results.length 
      : leagueData.new_entries?.results?.length || 0;
    
    console.log(`   📊 Will sync ${teamsToSync} teams`);
    console.log(`   🎯 Current gameweek: ${currentEvent?.id || 1}`);
    console.log(`   🏆 League: ${leagueData.league?.name}`);
    
    if (leagueData.new_entries?.results?.length > 0) {
      console.log('\n   📝 Sample teams that will be synced:');
      leagueData.new_entries.results.slice(0, 5).forEach((team, index) => {
        console.log(`      ${index + 1}. ${team.entry_name} - ${team.player_first_name} ${team.player_last_name}`);
      });
      if (leagueData.new_entries.results.length > 5) {
        console.log(`      ... and ${leagueData.new_entries.results.length - 5} more teams`);
      }
    }

    console.log('\n✅ All APIs working correctly!');
    console.log('\n🔧 To sync data:');
    console.log('   1. Go to http://localhost:3001');
    console.log('   2. Click the Settings gear icon');
    console.log('   3. Enter any password to access admin');
    console.log('   4. Click "Sync from FPL API"');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFullSync();