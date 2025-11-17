-- Add unique constraint to ensure a learner can only have a single enrollment per course
ALTER TABLE "lms"."course_enrollments"
ADD CONSTRAINT "course_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");
