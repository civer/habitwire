CREATE INDEX "idx_categories_user" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_checkins_habit_date" ON "checkins" USING btree ("habit_id","date");--> statement-breakpoint
CREATE INDEX "idx_habits_user_archived" ON "habits" USING btree ("user_id","archived");