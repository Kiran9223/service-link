-- Insert initial service categories
-- display_order: higher number = appears first in UI

INSERT INTO service_categories (name, description, display_order) VALUES
      ('Plumbing', 'Pipe installation and repair, drain cleaning, water heater services, fixture installation', 100),
      ('Electrical', 'Wiring, outlets, lighting installation, electrical panel upgrades, troubleshooting', 95),
      ('HVAC', 'Heating, ventilation, and air conditioning installation, repair, and maintenance', 90),
      ('Cleaning', 'Residential and commercial cleaning services, deep cleaning, move-in/move-out cleaning', 85),
      ('Lawn Care', 'Lawn mowing, landscaping, tree trimming, yard maintenance, seasonal cleanup', 80),
      ('Handyman', 'General home repairs, furniture assembly, minor installations, odd jobs', 75),
      ('Painting', 'Interior and exterior painting, wall preparation, cabinet refinishing', 70),
      ('Carpentry', 'Custom woodwork, cabinet installation, deck building, trim work, repairs', 65),
      ('Roofing', 'Roof installation, repair, inspection, gutter cleaning and installation', 60),
      ('Locksmith', 'Lock installation, key duplication, emergency lockout services, security upgrades', 55)
ON CONFLICT (name) DO NOTHING; -- Skip if categories already exist