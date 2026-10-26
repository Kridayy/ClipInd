import os

def fix_wallet_test():
    with open('tests/wallet.test.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # The test calls `approveSubmission` with `{ verifiedViews: 1000 }`
    # We need to manually inject a MetricSnapshot before this, because our backend now enforces real data
    # Actually, we can just update the submission to have verifiedViews = 1000 or 15000 in DB
    # or just create a MetricSnapshot.

    # Find the POST /api/submissions/:id/approve block
    content = content.replace("await request(app)\n      .post(`/api/submissions/${submissionId}/approve`)", 
"""await prisma.metricSnapshot.create({
      data: {
        submissionId,
        views: 1000,
        likes: 100,
        comments: 10,
        shares: 5
      }
    });

    const res = await request(app)
      .post(`/api/submissions/${submissionId}/approve`)""")
    
    # Do it for all `.post(*/approve)` calls in wallet.test.ts?
    # wait, there are multiple approve calls for different tests
    # let's just do it directly using a regex replacement

    with open('tests/wallet.test.ts', 'w', encoding='utf-8') as f:
        f.write(content)


def fix_submissions_test():
    with open('tests/submissions.test.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace("await request(app)\n      .post(`/api/submissions/${submissionId}/approve`)", 
"""await prisma.metricSnapshot.create({
      data: {
        submissionId,
        views: 10000,
        likes: 100,
        comments: 10,
        shares: 5
      }
    });

    const res = await request(app)
      .post(`/api/submissions/${submissionId}/approve`)""")
    
    with open('tests/submissions.test.ts', 'w', encoding='utf-8') as f:
        f.write(content)

fix_wallet_test()
fix_submissions_test()
print("Fixed tests requiring MetricSnapshot")
