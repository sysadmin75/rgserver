update users set challenges=0;
update robots set last_rating=rating where rating is not NULL;
update robots set disabled=true where not automatch and not disabled and compiled and passed;
