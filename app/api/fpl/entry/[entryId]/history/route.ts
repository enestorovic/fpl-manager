import { NextRequest, NextResponse } from 'next/server'

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId: entryIdParam } = await params
    const entryId = parseInt(entryIdParam)
    
    console.log(`Fetching manager history for entry ${entryId} from FPL API`)
    
    // Make request to the real FPL API
    const response = await fetch(`${FPL_BASE_URL}/entry/${entryId}/history/`, {
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
    
    console.log(`Successfully fetched history with ${data.current?.length || 0} gameweeks and ${data.chips?.length || 0} chips`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching manager history from FPL API:', error)
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch manager history from FPL API',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
