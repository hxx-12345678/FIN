import csv
import random
from datetime import datetime, timedelta

def generate_big4_data(filename):
    headers = [
        'Transaction ID', 'Date', 'Amount', 'Currency', 'Description',
        'GL Account Code', 'Account Name', 'Category', 'Entity',
        'Cost Center', 'Department', 'Vendor/Customer', 'Type', 'Status'
    ]

    entities = ['Global Corp HQ', 'EMEA Subsidiary', 'APAC Division', 'LATAM Branch']
    departments = ['Sales', 'Marketing', 'R&D', 'Operations', 'Finance', 'HR', 'IT']
    
    # Define Accounts and their typical categories
    accounts = [
        ('1000', 'Cash Operating', 'Asset'),
        ('1100', 'Accounts Receivable', 'Asset'),
        ('2000', 'Accounts Payable', 'Liability'),
        ('2100', 'Accrued Expenses', 'Liability'),
        ('4000', 'Product Revenue', 'Revenue'),
        ('4100', 'Services Revenue', 'Revenue'),
        ('5000', 'Cost of Goods Sold', 'COGS'),
        ('6000', 'Payroll Expenses', 'Expenses'),
        ('6100', 'Marketing & Advertising', 'Expenses'),
        ('6200', 'Software Subscriptions', 'Expenses'),
        ('6300', 'Travel & Entertainment', 'Expenses'),
        ('6400', 'Legal & Professional', 'Expenses'),
        ('6500', 'Rent & Utilities', 'Expenses')
    ]

    vendors = ['AWS', 'Salesforce', 'Google', 'Deloitte', 'WeWork', 'Stripe', 'Microsoft', 'Oracle', 'ADP']
    customers = ['Acme Corp', 'Globex', 'Soylent', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Ent']

    start_date = datetime(2026, 1, 1)
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for i in range(1, 2001):  # Generate 2000 rows
            # Random date within 2026
            days_offset = random.randint(0, 364)
            txn_date = start_date + timedelta(days=days_offset)
            
            acc_code, acc_name, category = random.choice(accounts)
            entity = random.choice(entities)
            dept = random.choice(departments)
            cost_center = f"{entity[:3].upper()}-{dept[:3].upper()}-{random.randint(10, 99)}"
            
            # Determine logic based on category
            if category == 'Revenue':
                amount = round(random.uniform(1000, 150000), 2)
                party = random.choice(customers)
                desc = f"Invoice payment from {party} for Q{((txn_date.month-1)//3)+1} services"
                txn_type = 'Credit'
            elif category == 'Expenses' or category == 'COGS':
                amount = round(random.uniform(-50000, -100), 2)
                party = random.choice(vendors)
                desc = f"Payment to {party} - {acc_name}"
                txn_type = 'Debit'
            else: # Assets/Liabilities
                amount = round(random.uniform(-100000, 100000), 2)
                party = "Internal/Bank"
                desc = f"Reconciliation entry - {acc_name}"
                txn_type = 'Debit' if amount < 0 else 'Credit'
                
            txn_id = f"TXN-{txn_date.strftime('%Y%m')}-{i:05d}"
            
            writer.writerow([
                txn_id,
                txn_date.strftime('%Y-%m-%d'),
                f"{amount:.2f}",
                'USD',
                desc,
                acc_code,
                acc_name,
                category,
                entity,
                cost_center,
                dept,
                party,
                txn_type,
                'Cleared'
            ])

if __name__ == '__main__':
    generate_big4_data('d:\\Fin\\Big4_Enterprise_Test_Data_2026.csv')
    print("Dataset generated successfully.")
