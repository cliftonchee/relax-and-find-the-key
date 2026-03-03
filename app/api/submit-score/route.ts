import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, score, difficulty } = body

  const MAX_SCORE = 60 * 3 * 10 // TIME_PER_QUESTION * max_multiplier * questions = 1800

  if (
    !username ||
    typeof score !== 'number' ||
    !isFinite(score) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE ||
    !['easy', 'medium', 'hard'].includes(difficulty)
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const trimmedUsername = String(username).trim().slice(0, 20) || 'ANON'

  const { data, error } = await supabase
    .from('scores')
    .insert({ username: trimmedUsername, score, difficulty })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
