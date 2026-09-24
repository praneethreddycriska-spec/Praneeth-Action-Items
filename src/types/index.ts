export type ActionStatus = 'inbox' | 'todo' | 'in_progress' | 'waiting' | 'blocked' | 'completed'

export const STATUS_LABELS: Record<ActionStatus, string> = {
  inbox: 'Inbox',
  todo: 'To Do',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  blocked: 'Blocked',
  completed: 'Completed',
}

export const STATUS_ORDER: ActionStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'blocked', 'completed']

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_color: string | null
  created_at: string
}

export interface Community {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  archived_at: string | null
  created_by: string
  created_at: string
}

export interface CommunityStats {
  community_id: string
  open: number
  completed: number
  overdue: number
  critical: number
  completion_pct: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface ActionItem {
  id: string
  title: string
  description: string | null
  community_id: string | null
  owner_id: string | null
  follow_up_person_id: string | null
  priority: number
  status: ActionStatus
  deadline: string | null
  start_date: string | null
  expected_output: string | null
  actual_output: string | null
  sort_order: number
  created_by: string
  completed_at: string | null
  archived_at: string | null
  waiting_for_person_id: string | null
  waiting_expected_response_date: string | null
  created_at: string
  updated_at: string
  // joined
  community?: Community | null
  owner?: Profile | null
  follow_up_person?: Profile | null
  tags?: Tag[]
}

export interface ActionItemComment {
  id: string
  action_item_id: string
  author_id: string
  body: string
  created_at: string
  user?: Profile | null
}

export type ActivityType =
  | 'created' | 'edited' | 'priority_changed' | 'deadline_changed' | 'community_changed'
  | 'owner_changed' | 'follow_up_changed' | 'status_changed' | 'comment_added'
  | 'output_added' | 'completed' | 'reopened' | 'archived'

export interface ActionItemActivity {
  id: string
  action_item_id: string
  actor_id: string | null
  action: ActivityType
  details: Record<string, unknown> | null
  created_at: string
  user?: Profile | null
}

export type DeadlineState = 'overdue' | 'today' | 'tomorrow' | 'soon3' | 'soon7' | 'future' | 'none' | 'completed'

export type GroupMode = 'community' | 'individual' | 'status' | 'priority' | 'deadline' | 'none'

export interface AIActionExtraction {
  title: string
  community?: string
  priority?: number
  deadline?: string | null
  follow_up_person?: string
  expected_output?: string
  confidence: number
}
