import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_golden_data(filename, num_rows=10000):
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2025, 3, 1)
    
    categories = {
        'Revenue': ['Subscription Revenue', 'Professional Services', 'Expansion Revenue'],
        'COGS': ['AWS Hosting', 'Stripe Fees', 'Customer Support Salaries', 'Data Center'],
        'OpEx - R&D': ['Engineering Salaries', 'Product Management', 'Cloud Software - Dev'],
        'OpEx - S&M': ['Google Ads', 'LinkedIn Ads', 'Sales Commissions', 'Marketing Software'],
        'OpEx - G&A': ['Office Rent', 'Legal Fees', 'Recruiting', 'Executive Salaries', 'Insurance']
    }
    
    data = []
    
    # Generate dates distributed across the range
    dates = [start_date + timedelta(days=random.randint(0, (end_date - start_date).days)) for _ in range(num_rows)]
    dates.sort()
    
    for i in range(num_rows):
        dt = dates[i]
        
        # Determine category group
        # Most transactions are OpEx/COGS, fewer are large Revenue entries
        chance = random.random()
        if chance < 0.15:
            cat_group = 'Revenue'
        elif chance < 0.35:
            cat_group = 'COGS'
        elif chance < 0.60:
            cat_group = 'OpEx - R&D'
        elif chance < 0.85:
            cat_group = 'OpEx - S&M'
        else:
            cat_group = 'OpEx - G&A'
            
        category = random.choice(categories[cat_group])
        
        # Monthly growth factor (sigmoid-ish)
        months_passed = (dt.year - 2023) * 12 + dt.month - 1
        growth_factor = 1.0 + (0.05 * months_passed) # 5% linear growth for simplicity but high impact
        
        # Determine amount
        if cat_group == 'Revenue':
            amount = random.uniform(500, 5000) * growth_factor
            if 'Expansion' in category: amount *= 0.3
        else:
            amount = -random.uniform(100, 2000) * (1.0 + 0.03 * months_passed) # Expenses grow slower
            
        # Add seasonality spikes
        if dt.month == 12 and 'Marketing' in cat_group:
            amount *= 1.5
            
        description = f"Transaction for {category} - REF-{random.randint(1000, 9999)}"
        
        data.append([
            dt.strftime('%Y-%m-%d'),
            description,
            round(amount, 2),
            category
        ])
    
    df = pd.DataFrame(data, columns=['Date', 'Description', 'Amount', 'Category'])
    df.to_csv(filename, index=False)
    print(f"✅ Generated {num_rows} rows of Golden Data in {filename}")

if __name__ == "__main__":
    generate_golden_data('d:/Fin/backend/tests/golden_enterprise_10k.csv', 10000)
