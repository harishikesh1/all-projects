SELECT name FROM Movies;
SELECT name, year FROM Movies;
SELECT name FROM Movies WHERE year = '1940';
SELECT name from Movies WHERE year < '1950';
SELECT name FROM Movies WHERE year >= '1940' AND year <= '1950';
SELECT name FROM Movies WHERE year < '1950' OR year > '1980';
SELECT name FROM Movies WHERE year != '1940';
SELECT name FROM Movies ORDER BY name ASC;
SELECT name FROM Movies ORDER BY name DESC;
SELECT name , year FROM Movies ORDER BY year DESC , name ASC;
SELECT DISTINCT forename FROM Names;
SELECT DISTINCT forename, surname FROM Names;
SELECT COUNT(name) FROM Employees;
SELECT COUNT(name) FROM Employees WHERE salary > '2000';    
SELECT SUM (salary) FROM Employees;
SELECT MAX(salary) FROM Employees;
SELECT COUNT(DISTINCT(company)) FROM Employees;
SELECT company, COUNT(*) FROM Employees GROUP BY company;

















































































