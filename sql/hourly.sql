DO $$
DECLARE
    one_week_ago integer;
    one_month_ago integer;
BEGIN
    /* Update trophies */
    update robots set fast=FALSE where fast;
    update robots set fast=TRUE where id in
        (select id from robots
            where compiled and passed and not disabled and rating is not Null
                  and time < 2
            order by rating desc limit 10);

    update robots set short=FALSE where short;
    update robots set short=TRUE where id in
        (select id from robots
            where compiled and passed and not disabled and rating is not Null
                  and length(compiled_code) < 1000
            order by rating desc limit 10);

    /* Reset automatch */
    one_month_ago := round(extract(epoch from now()) - 60 * 60 * 24 * 30);
    update robots set automatch = 'f' from users where robots.user_id=users.id
            and automatch
            and users.last_active < one_month_ago;

    /* Delete history */
    one_week_ago := round(extract(epoch from now()) - 60 * 60 * 24 * 7);
    delete from history where timestamp < one_week_ago;
END $$;
