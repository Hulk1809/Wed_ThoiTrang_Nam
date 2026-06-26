BEGIN TRANSACTION;
USE GuynDb;
PRINT 'Starting migration...';

DELETE FROM UserBehaviors;
DELETE FROM VideoTrackings;
DELETE FROM OrderItems;
DELETE FROM Orders;
DELETE FROM CartItems;
DELETE FROM Carts;
DELETE FROM Products;
DELETE FROM Users;
PRINT 'Existing data cleared.';

SET IDENTITY_INSERT Users ON;
SET IDENTITY_INSERT Users OFF;
PRINT 'Users migrated.';

SET IDENTITY_INSERT Products ON;
SET IDENTITY_INSERT Products OFF;
PRINT 'Products migrated.';

SET IDENTITY_INSERT Orders ON;
SET IDENTITY_INSERT Orders OFF;
PRINT 'Orders migrated.';

SET IDENTITY_INSERT OrderItems ON;
SET IDENTITY_INSERT OrderItems OFF;
PRINT 'Order items migrated.';

SET IDENTITY_INSERT UserBehaviors ON;
SET IDENTITY_INSERT UserBehaviors OFF;
PRINT 'User behaviors migrated.';

SET IDENTITY_INSERT VideoTrackings ON;
SET IDENTITY_INSERT VideoTrackings OFF;
PRINT 'Video trackings migrated.';

COMMIT TRANSACTION;
PRINT 'Migration completed successfully!';