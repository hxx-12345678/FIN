import csv
import random
from datetime import datetime, timedelta

def generate_enterprise_csv(filename, rows=1000):
    start_date = datetime(2023, 1, 1)
    categories = {
        "Revenue": ["Subscription Revenue", "Enterprise License", "Professional Services", "Overage Fees"],
        "Payroll": ["Engineering Salary", "Sales Commissions", "Marketing Staff", "Executive Compensation"],
        "Web Services": ["AWS Hosting", "Google Cloud", "Sentry Logging", "DataDog Monitoring"],
        "Rent": ["NY Office Rent", "SF Office Rent", "Utility Bills"],
        "Marketing": ["Google Ads", "LinkedIn Campaign", "Event Sponsorship", "Content Marketing"],
        "Software": ["Slack Subscription", "Zoom License", "GitHub Enterprise", "Figma Design"],
    }
    
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Description", "Amount", "Category"])
        
        for i in range(rows):
            # Select random category and description
            cat = random.choice(list(categories.keys()))
            desc = random.choice(categories[cat])
            
            # Random date within 2023-2024
            days_offset = random.randint(0, 730)
            tx_date = (start_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")
            
            # Amount logic
            if cat == "Revenue":
                amt = random.randint(5000, 50000)
            elif cat == "Payroll":
                amt = -random.randint(20000, 40000)
            elif cat == "Web Services":
                amt = -random.randint(1000, 8000)
            elif cat == "Rent":
                amt = -random.randint(5000, 15000)
            elif cat == "Marketing":
                amt = -random.randint(2000, 10000)
            else: # Software
                amt = -random.randint(500, 3000)
                
            writer.writerow([tx_date, desc, amt, cat])

if __name__ == "__main__":
    generate_enterprise_csv("enterprise_tx_1000.csv", 1000)
    print("Generated enterprise_tx_1000.csv")
