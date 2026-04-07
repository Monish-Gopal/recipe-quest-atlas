

## Plan: Expand countries list to all 195 UN-recognized countries

### What changes
**Single file edit:** `src/data/countries.ts`

Replace the current 76-entry `COUNTRIES` array with a complete list of all 195 UN-recognized sovereign states (193 UN members + 2 observer states: Vatican City and Palestine). The existing non-sovereign entry "Scotland" will be kept as a bonus entry since recipes may reference it. "Taiwan" will also be kept.

Each entry maintains the same `{ name, flag, lat, lng }` structure. Approximately 120 new countries will be added, covering all missing nations from every continent (e.g., Andorra, Angola, Antigua and Barbuda, Armenia, Azerbaijan, Bahamas, Bahrain, Barbados, Belarus, Belize, Benin, Bhutan, Bolivia, Bosnia and Herzegovina, Botswana, Brunei, Bulgaria, Burkina Faso, Burundi, Cabo Verde, Cameroon, Central African Republic, Chad, Comoros, Congo, Costa Rica, Côte d'Ivoire, Cyprus, Djibouti, Dominica, Dominican Republic, East Timor, Ecuador, El Salvador, Equatorial Guinea, Eritrea, Estonia, Eswatini, Fiji, Gabon, Gambia, Georgia, Grenada, Guatemala, Guinea, Guinea-Bissau, Guyana, Haiti, Honduras, Kazakhstan, Kiribati, Kosovo, Kuwait, Kyrgyzstan, Laos, Latvia, Lesotho, Liberia, Liechtenstein, Lithuania, Luxembourg, Madagascar, Malawi, Maldives, Mali, Malta, Marshall Islands, Mauritania, Mauritius, Micronesia, Moldova, Monaco, Mongolia, Montenegro, Mozambique, Myanmar, Namibia, Nauru, Nicaragua, Niger, North Korea, North Macedonia, Oman, Palau, Palestine, Panama, Papua New Guinea, Paraguay, Qatar, Rwanda, Saint Kitts and Nevis, Saint Lucia, Saint Vincent and the Grenadines, Samoa, San Marino, São Tomé and Príncipe, Serbia, Seychelles, Sierra Leone, Slovakia, Slovenia, Solomon Islands, Somalia, South Sudan, Sudan, Suriname, Tajikistan, Tanzania, Togo, Tonga, Trinidad and Tobago, Turkmenistan, Tuvalu, Uganda, United Arab Emirates, Uruguay, Uzbekistan, Vanuatu, Vatican City, Yemen, Zambia, Zimbabwe).

The `findCountry` function and `CountryData` interface remain unchanged. No other files need editing.

