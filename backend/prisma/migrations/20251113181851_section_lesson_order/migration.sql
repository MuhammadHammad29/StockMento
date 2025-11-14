/*
  Warnings:

  - A unique constraint covering the columns `[section_id,position]` on the table `course_lessons` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "lms"."course_lessons_course_id_position_key";

-- CreateIndex
CREATE UNIQUE INDEX "course_lessons_section_id_position_key" ON "lms"."course_lessons"("section_id", "position");
