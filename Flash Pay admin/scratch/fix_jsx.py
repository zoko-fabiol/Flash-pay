import os

filepath = r'c:\Users\Clauseph\Desktop\Flash Pay React\Flash Pay admin\src\pages\queue\TransactionDetailsPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the missing divs and property name around line 501
new_lines = []
for line in lines:
    if '{/* Right: Actions & Timeline */}' in line:
        new_lines.append('          </div>\n')
        new_lines.append('        </div>\n\n')
        new_lines.append(line)
    else:
        new_lines.append(line)

# Also fix the end of the file (remove extra braces)
# The file should end with:
#       )}
#     </div>
#   );
# };
#
# export default TransactionDetailsPage;

# Let's just find the last export default and truncate everything after the correct closing sequence
content = "".join(new_lines)
correct_end = """      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          labels={['Preuve de paiement']}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </div>
  );
};

export default TransactionDetailsPage;
"""

if 'export default TransactionDetailsPage;' in content:
    header = content.split('      {lightboxImages && (')[0]
    final_content = header + correct_end
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("File fixed successfully")
else:
    print("Could not find anchor point")
