import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TEMP_SECRET = '7b3e9f1a6c4d8025be9a3f1c6d4b8e027a5c9d3e1b6f804'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

// 카테고리 null이던 70개 상품 — 상품명 보고 직접 분류(2026-08-06)
const FIXES: Record<string, string> = {
  '9f93a62b-8fac-46d0-977c-ac71d1c1f1ed': '스킨케어',
  '2056aae2-4a68-4df9-8965-8164cbcfa54b': '스킨케어',
  'd2869365-d56e-4216-b8f3-12e9444c6673': '스킨케어',
  'e21704d2-bfbb-4b35-ba38-da1cbd21d845': '스킨케어',
  '0811c36d-945d-4bd0-ada5-ffaeb1314000': '스킨케어',
  'c6393f75-2a88-4b55-b8a9-9346998f2e89': '스킨케어',
  '8368abfe-d947-4f56-9c64-04f385dfc37c': '스킨케어',
  '6234f44c-a0b6-4fda-9ef3-a547428b9ad4': '스킨케어',
  'dd0cc96d-8680-4a4b-9eae-9f9a0c92a922': '스킨케어',
  'b058c411-3e83-481d-8943-447005f5abdf': '스킨케어',
  'ae4ce519-e10a-4409-8399-edd0479bf2d6': '스킨케어',
  'a83ce9a4-41c9-4d48-a481-dc4cb2e3ab61': '스킨케어',
  '0f5719db-79ac-4e6b-b43f-a6e3facaaa2a': '스킨케어',
  'b5103372-258d-48d6-af71-32426f0f237c': '스킨케어',
  '63a1c978-3658-4852-971e-17c1ad3c33c4': '스킨케어',
  '45eee444-2c02-408b-b262-7be0e55d7080': '스킨케어',
  '6c622fd8-da5b-4f0a-bde3-13c0400d44fe': '스킨케어',
  '6275667b-06ac-47f5-a609-cc18574214a0': '헤어·바디',
  '9d788d54-5573-4aa1-8080-6df9129a4043': '헤어·바디',
  '68c2bc77-6ce7-409e-845f-e71a74387092': '스킨케어',
  '68fc9845-597c-406f-b06f-2e82c33d8cbd': '헤어·바디',
  'b5c99f07-a8c7-4f5d-a083-df28cc475fea': '헤어·바디',
  '3147a496-bc81-4aee-89dd-69caf469c942': '헤어·바디',
  'c234c1c3-47b6-4cc0-af43-96c883578abf': '헤어·바디',
  'a502fc54-6833-429f-8ba6-d2c2710d4b43': '메이크업',
  'e6f98d44-0741-4e49-91fc-b431971871c3': '메이크업',
  '3b019307-9c35-45a8-a98b-aa453128ba99': '메이크업',
  '5b9778fc-2641-4865-ab53-851b95fb1324': '메이크업',
  '06feb997-e6a8-45e0-a79d-a2ba59a032ba': '메이크업',
  '462b8387-543d-4123-8c21-d56605932fca': '메이크업',
  'ef70ad2d-b856-4200-983e-b1cb4f33a24a': '메이크업',
  '589c2618-7007-4424-a05e-2f60c4c67eac': '메이크업',
  'd568d508-9874-435d-bcac-4e174ded7511': '헤어·바디',
  '812857bb-a6f3-49fc-82dc-78f465a67e67': '헤어·바디',
  '7faecb7b-6571-4635-aa07-569603e9211b': '스킨케어',
  '97119d4c-65cf-4b66-bb0c-506bb5014536': '스킨케어',
  '8de9a884-f5ca-4db3-85ed-b9ea3407b225': '스킨케어',
  '3287c0b6-4ac3-4295-b51e-8dc32a831b4a': '스킨케어',
  'ee44f919-6ddc-4e8d-a1a6-9458761df916': '스킨케어',
  '16c969e9-670e-4f9c-93e9-71fba6ad04bb': '스킨케어',
  'd9acf1be-8fd3-4697-a880-f5f94320f10b': '스킨케어',
  'be91cbe2-8aac-498b-b06a-af7ad702b6a0': '스킨케어',
  '737cfcef-b443-4d86-a2e5-e3d86dbdf25e': '스킨케어',
  '1fb46eeb-f7ec-46ac-bfc2-5505a3730fa6': '스킨케어',
  '96e6886b-7914-4d0c-903a-de495e783baa': '스킨케어',
  '173c3ad0-023b-42cb-9cbc-78d32b175489': '스킨케어',
  '4d1fb406-d8c7-4734-96eb-79cf8b948889': '스킨케어',
  'cd78dc54-c985-4926-accf-3e34d5ff2ef9': '스킨케어',
  'cfe5480d-c20b-4b1b-8cd2-a6267ba80484': '스킨케어',
  '9257cbfb-7fab-481b-878a-db06d4cb0798': '향수',
  'fb552e56-b303-44f0-9e57-add8be25f3aa': '향수',
  '36977894-d766-4dcf-aac0-fb207729d05a': '퍼퓸 디퓨저',
  'fc8bae05-9a3f-40cc-8cc2-3369cb5f0f8d': '스킨케어',
  '542d3f65-d09b-45b3-927a-1da6f882ca3c': '스킨케어',
  '5c8dd76f-9495-4ba1-b7b5-4dbd653a6dbf': '스킨케어',
  '4be12840-d720-42d6-9759-551f895d33ac': '스킨케어',
  '2b4030ee-0d9f-4b84-a397-a82835d9d18a': '스킨케어',
  '24c32903-09a8-46f8-934e-ce74fac9996a': '스킨케어',
  'e8b98a1e-c0ee-4660-a187-5dcd778ce160': '스킨케어',
  'd66014e7-f19a-4f07-93b4-a2b4b30cbc49': '스킨케어',
  '1772725c-34c1-42b0-ab12-879ee8614358': '스킨케어',
  '3b565d51-ba3c-4a84-873e-3d0fdd07ab47': '헤어·바디',
  'de5ce923-588c-4df7-b4eb-1c9f6a4c7806': '헤어·바디',
  '30ded2a0-7c60-47e6-a2ae-f70b8c1e0bdb': '헤어·바디',
  '1f7bf26e-1a12-4109-9c08-5c3d0a12b2c4': '헤어·바디',
  '1d8be732-1a3d-4e2f-a1a4-8f1d61f774e2': '스킨케어',
  '7feb1635-36fd-426f-bd23-c5bfe9584097': '헤어·바디',
  '55b4cea6-a9d2-4755-a28e-38e1a00f5716': '스킨케어',
  '4758ee00-13b4-4252-83c7-984995210a71': '스킨케어',
  'd1bc04f4-058d-4ea6-a796-e24990e5a41f': '스킨케어',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({}); return }
  if (!SERVICE_ROLE) { res.status(500).json({ error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const results: Record<string, string> = {}
  for (const [id, category] of Object.entries(FIXES)) {
    const { error } = await supabase.from('products').update({ category }).eq('id', id)
    results[id] = error ? `error: ${error.message}` : 'ok'
  }
  const failed = Object.entries(results).filter(([, v]) => v !== 'ok')
  res.status(200).json({ total: Object.keys(FIXES).length, failed: failed.length, failedDetail: failed })
}
