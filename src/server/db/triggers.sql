-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================
-- This function is called by triggers on all master data tables
-- It reads the current_user_id from the PostgreSQL session variable
-- set by tRPC's protectedProcedure

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  user_id_value TEXT;
BEGIN
  -- Get the current user ID from the session variable
  user_id_value := current_setting('app.current_user_id', true);

  -- For INSERT and UPDATE operations
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      user_id,
      changed_data,
      previous_data
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      TG_OP,
      user_id_value,
      row_to_json(NEW)::TEXT,
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::TEXT ELSE NULL END
    );
    RETURN NEW;

  -- For DELETE operations
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      user_id,
      changed_data,
      previous_data
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::TEXT,
      TG_OP,
      user_id_value,
      NULL,
      row_to_json(OLD)::TEXT
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INSTALL TRIGGERS ON MASTER DATA TABLES
-- ============================================================================

-- Brands
DROP TRIGGER IF EXISTS audit_brands ON brands;
CREATE TRIGGER audit_brands
AFTER INSERT OR UPDATE OR DELETE ON brands
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- SKUs
DROP TRIGGER IF EXISTS audit_skus ON skus;
CREATE TRIGGER audit_skus
AFTER INSERT OR UPDATE OR DELETE ON skus
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Retailers
DROP TRIGGER IF EXISTS audit_retailers ON retailers;
CREATE TRIGGER audit_retailers
AFTER INSERT OR UPDATE OR DELETE ON retailers
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Brand Retailers
DROP TRIGGER IF EXISTS audit_brand_retailers ON brand_retailers;
CREATE TRIGGER audit_brand_retailers
AFTER INSERT OR UPDATE OR DELETE ON brand_retailers
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Purchase Orders
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Forecasts
DROP TRIGGER IF EXISTS audit_forecasts ON forecasts;
CREATE TRIGGER audit_forecasts
AFTER INSERT OR UPDATE OR DELETE ON forecasts
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory
DROP TRIGGER IF EXISTS audit_inventory ON inventory;
CREATE TRIGGER audit_inventory
AFTER INSERT OR UPDATE OR DELETE ON inventory
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Retail Orders
DROP TRIGGER IF EXISTS audit_retail_orders ON retail_orders;
CREATE TRIGGER audit_retail_orders
AFTER INSERT OR UPDATE OR DELETE ON retail_orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Payments
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
