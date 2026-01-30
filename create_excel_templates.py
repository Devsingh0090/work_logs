import pandas as pd
import os

# Create templates directory and excel_templates subdirectory if they don't exist 
templates_dir = 'templates/excel_templates'
if not os.path.exists(templates_dir):
    os.makedirs(templates_dir)





# Operators Template (headers only, no sample rows)
operators_template = pd.DataFrame({
    'Operator ID': [],
    'Name': [],
    'Email': [],
    'Role': []
})


# Items Master Template (headers only, no sample rows)
items_master_template = pd.DataFrame({
    'Items ID': [],
    'Items Name': [],
    'Price': [],
    'CGST (%)': [],
    'SGST (%)': [],
    'GST (%)': []
})




# Chemical Template (headers only, no sample rows)
chemical_template = pd.DataFrame({
    'Chemical Name': [],
    'Supplier Name': [],
    'Expiry Date': [],
    'Quantity': [],
    'Unit': [],
    'Location': [],
    'Current Stock': [],
    'Usages': []
})

# Save the templates as Excel files
operators_template.to_excel(os.path.join(templates_dir, 'operators_template.xlsx'), index=False)
items_master_template.to_excel(os.path.join(templates_dir, 'items_master_template.xlsx'), index=False)
chemical_template.to_excel(os.path.join(templates_dir, 'chemical_template.xlsx'), index=False)

print("Excel templates created successfully!")

print("- operators_template.xlsx")
print("- items_master_template.xlsx")
print("- chemical_template.xlsx")
    # Measurement Template (headers only, no sample rows)
measurement_template = pd.DataFrame({
    'Unit of Measurement Name': [],
    'Symbol': []
})

# Save the measurement template as Excel file
measurement_template.to_excel(os.path.join(templates_dir, 'measurement_template.xlsx'), index=False)

print("- measurement_template.xlsx")

# Equipment Master Template (headers only, no sample rows)
equipment_master_template = pd.DataFrame({
    'Equipment ID': [],
    'Equipment Name': [],
    'Building': [],
    'Dept/Floor': [],
    'Room No./Lab': [],
    'Buy Details': [],
    'Warranty': [],
    'Total Equipment': []
})

# Save the equipment master template as Excel file
equipment_master_template.to_excel(os.path.join(templates_dir, 'equipment_master_template.xlsx'), index=False)

print("- equipment_master_template.xlsx")
