import os
import glob
import re

cleanup_block = """    await prisma.transaction.deleteMany();
    await prisma.payoutRequest.deleteMany();
    await prisma.payoutMethod.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.metricSnapshot.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.resetToken.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.user.deleteMany();"""

# find all test files
test_files = glob.glob('tests/*.test.ts')

for file in test_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find everything inside `beforeAll(async () => { ... }` up until `const` or `let` or another `await` that isn't `deleteMany`
    # Actually, simpler: replace all consecutive `await prisma.*.deleteMany();` with the standard block.
    
    # Match 2 or more consecutive `await prisma.*.deleteMany();` lines (allowing whitespace)
    pattern = r'(?:\s*await prisma\.[a-zA-Z]+\.deleteMany\(\);\n?){2,}'
    
    if re.search(pattern, content):
        new_content = re.sub(pattern, "\n" + cleanup_block + "\n", content, count=1)
        # also if there are other deleteMany blocks somehow, we only replace the first one in beforeAll
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated cleanup in {file}")

print("Test cleanups updated.")
