PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birthday DATE NOT NULL
    , photo TEXT, gender TEXT);
INSERT INTO birthdays VALUES(1,'Karien','2006-01-29','/uploads/a6da4aea80c4c28972b961e271dde28e','female');
INSERT INTO birthdays VALUES(2,'Alan','2007-04-06','/uploads/5af28337073cd00401fa84d3e149789d','male');
INSERT INTO birthdays VALUES(3,'Around','2010-03-13','/uploads/f1e5c202f66d1b392d1f4c72e95c4e4e','male');
INSERT INTO birthdays VALUES(4,'Hima','2014-04-25','/uploads/955241b5dd477ef01f763c395930e720','female');
INSERT INTO birthdays VALUES(5,'Muhammad','2019-10-08','/uploads/8720ce32fe3763c96660580f79192ab1','male');
INSERT INTO birthdays VALUES(6,'Perinaz','2022-02-19','/uploads/caee29c35d3fa0083e78e039348484b2','female');
INSERT INTO birthdays VALUES(7,'Hevi','1998-02-26','/uploads/270e92540137858c3b121cf9f3f707ce','female');
INSERT INTO birthdays VALUES(8,'Omer','1999-11-19','/uploads/d6a5167435f681e692933071260249e9','male');
INSERT INTO birthdays VALUES(9,'Asma','2001-03-09','/uploads/bf29f8c7cb695084ee4e17f9c0290b44','female');
INSERT INTO birthdays VALUES(10,'Abdullah','2002-12-03','/uploads/9f0946b5f3dd22bbe449805e05e31d98','male');
INSERT INTO birthdays VALUES(11,'Muhammad','2005-09-14','/uploads/5e0fbe9122b98dce24c44fb2e60cf4b7','male');
INSERT INTO birthdays VALUES(12,'Hassan','2007-12-14','/uploads/60d6c9094e6ca7b674a8d338510b4075','male');
INSERT INTO birthdays VALUES(13,'Saad','2010-02-16','/uploads/62156a5757c2f0f36a1cdf98f4f0e819','male');
INSERT INTO birthdays VALUES(14,'Zahra','2016-08-31','/uploads/a2ae31a99948c4376b4028b78602b333','female');
INSERT INTO birthdays VALUES(15,'Manisa','2012-10-12','/uploads/ce268e50484a2be99f95fe4d731bf51d','female');
INSERT INTO birthdays VALUES(16,'Ivan','2013-11-23','/uploads/7293b9f79cc1424443783448b9c6bb52','male');
INSERT INTO birthdays VALUES(17,'Vian','2016-11-26','/uploads/5fa2333dcdadb7813e81bb835123dc8a','female');
INSERT INTO birthdays VALUES(18,'Ayaz','2018-01-20','/uploads/ca41eed3488b996ce4123b87e9fa0938','male');
INSERT INTO birthdays VALUES(19,'Naze','2024-04-24','/uploads/d3fade22660e23278daad7732888d8f7','female');
INSERT INTO birthdays VALUES(20,'Hamrien','2008-10-12','/uploads/d7293a49de87cf1a94f993d600da03c1','female');
INSERT INTO birthdays VALUES(21,'Narien','2010-01-06','/uploads/323420163cb68ec954083b20750215c8','female');
INSERT INTO birthdays VALUES(22,'Talien','2016-10-11','/uploads/5059727c95c5e4d42d28db60a6c766e3','female');
INSERT INTO birthdays VALUES(23,'Jien','2007-10-03','/uploads/af9e2fb6567fa5e9eb27e13c7635bc2f','female');
INSERT INTO birthdays VALUES(24,'Lorien','2010-03-10','/uploads/84a586b5fe39a7a2d8a388be2fd86835','female');
INSERT INTO birthdays VALUES(25,'Sarah','2019-02-04','/uploads/60286bb96ce4a0f21f99f614d992830e','female');
INSERT INTO birthdays VALUES(26,'Azdashier','2006-10-09','/uploads/fa779899ee5f4aeeb4f7f585fbfd15f9','male');
INSERT INTO birthdays VALUES(27,'Zahra','2008-01-25','/uploads/81b5fd930214562eb0f25057ad06f230','female');
INSERT INTO birthdays VALUES(28,'Xalat','2013-12-30','/uploads/e6a85b075f48400a7b800f867d3ba263','female');
INSERT INTO birthdays VALUES(29,'Azad','2016-06-20','/uploads/059151aba572bebe4364a6a28f89f4e9','male');
INSERT INTO birthdays VALUES(30,'Azad','2018-06-28','/uploads/bc5c07fae5631540d342838ad65aec76','male');
INSERT INTO birthdays VALUES(31,'Aram','2020-02-23','/uploads/4838bc7d07a218ebff412401bb9f52c3','male');
INSERT INTO birthdays VALUES(32,'Rashid','2023-10-31','/uploads/c7975ff44992c3d83eb04f0d4d0f45dc','male');
INSERT INTO birthdays VALUES(33,'Ahmed','2009-02-09','/uploads/ee613aba419ed17e5acf1755b12db474','male');
INSERT INTO birthdays VALUES(34,'Ronie','2010-04-05','/uploads/a1f6871e2a25a6ba2453937a40683c0a','male');
INSERT INTO birthdays VALUES(35,'Reber','2012-08-09','/uploads/616e137f62cbbb958f03bbe647b94398','male');
INSERT INTO birthdays VALUES(36,'Suar','2016-10-16','/uploads/14ebb943b2d5116c37bb90357fc44bcc','male');
INSERT INTO birthdays VALUES(37,'Zin','2010-05-13','/uploads/3ce15d7803a22a05167dd9c7bf0492f6','female');
INSERT INTO birthdays VALUES(38,'Lewend','2012-01-15','/uploads/bd7fc53f22a378220fae93e2fd509215','male');
INSERT INTO birthdays VALUES(39,'Miran','2021-08-17','/uploads/ee53e0f402168fac87fe94ddadb2154e','male');
INSERT INTO birthdays VALUES(44,'ebazar','2024-11-29','/uploads/7bb2e3efa8f9060721565bf7c8f75a83',NULL);
CREATE TABLE smtp_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            smtpServer TEXT NOT NULL,
            smtpPort INTEGER NOT NULL,
            smtpEmail TEXT NOT NULL,
            smtpPassword TEXT NOT NULL,
            recipientEmail TEXT NOT NULL
        );
INSERT INTO smtp_settings VALUES(1,'smtp.gmail.com',587,'biraninarojbune@gmail.com','qaxuhhgqlouzgpte','suar.mustafa@gmail.com');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('birthdays',47);
INSERT INTO sqlite_sequence VALUES('smtp_settings',1);
COMMIT;
