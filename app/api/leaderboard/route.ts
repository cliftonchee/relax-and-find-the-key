import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const difficulty = request.nextUrl.searchParams.get('difficulty')
  if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('scores')
    .select('id, username, score, created_at')
    .eq('difficulty', difficulty)
    .order('score', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
