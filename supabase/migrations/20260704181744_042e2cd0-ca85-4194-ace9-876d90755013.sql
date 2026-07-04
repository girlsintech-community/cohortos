
ALTER TABLE public.posts ADD CONSTRAINT posts_author_profile_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.discussions ADD CONSTRAINT discussions_author_profile_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.discussion_replies ADD CONSTRAINT discussion_replies_author_profile_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_submissions ADD CONSTRAINT challenge_submissions_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
