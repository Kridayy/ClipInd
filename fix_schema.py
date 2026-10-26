import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# find model Submission
sub_str = """  earnings        Float            @default(0)
  status          SubmissionStatus @default(PENDING)
  submittedAt     DateTime         @default(now())
  updatedAt       DateTime         @updatedAt"""

new_sub_str = """  earnings        Float            @default(0)
  status          SubmissionStatus @default(PENDING)
  
  fraudScore      Float            @default(0.0)
  fraudFlags      String           @default("[]")
  isSuspicious    Boolean          @default(false)

  snapshots       MetricSnapshot[]

  submittedAt     DateTime         @default(now())
  updatedAt       DateTime         @updatedAt"""

if sub_str in content:
    content = content.replace(sub_str, new_sub_str)
else:
    print("Could not find exact string for Submission model.")

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Submission model in schema.prisma.")
