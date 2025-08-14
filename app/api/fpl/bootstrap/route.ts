import { NextRequest, NextResponse } from 'next/server'

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api'

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching FPL bootstrap data (events, teams, etc.)')
    
    // Make request to the real FPL API
    const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      // Add timeout and error handling
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Extract key information
    const currentEvent = data.events?.find((event: any) => event.is_current) || data.events?.[0]
    const nextEvent = data.events?.find((event: any) => event.is_next)
    
    console.log(`Successfully fetched bootstrap data - Current GW: ${currentEvent?.id || 'N/A'}, Next GW: ${nextEvent?.id || 'N/A'}`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching FPL bootstrap data:', error)
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch FPL bootstrap data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}