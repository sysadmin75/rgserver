update users set challenges=0;
update robots set last_rating=rating where rating is not NULL;
