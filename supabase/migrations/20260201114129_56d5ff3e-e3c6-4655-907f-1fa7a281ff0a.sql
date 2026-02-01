-- Add DELETE policy for conversations table
-- Allows conversation participants to delete conversations they are part of

CREATE POLICY "Users can delete their own conversations"
ON public.conversations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  )
);

-- Also add DELETE policy for conversation_participants to allow cleanup
CREATE POLICY "Users can leave conversations"
ON public.conversation_participants FOR DELETE
USING (auth.uid() = user_id);