<p align="center"><img src="docs/images/logo.png" width="180" alt="โลโก้ VFX NexgerLab"></p>

<h1 align="center">VFX NexgerLab</h1>

<p align="center">สตูดิโอสร้างเอฟเฟกต์พิกเซลอาร์ตที่ทำงานออฟไลน์ เลือกเอฟเฟกต์ที่เล่นอยู่ ปรับ แล้วส่งออกเข้าเกม</p>

<p align="center">
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest">ดาวน์โหลด</a>
  ·
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml"><img src="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest"><img src="https://img.shields.io/github/v/release/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab?include_prereleases" alt="รุ่นล่าสุด"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL%201.1-blue" alt="สัญญาอนุญาต BSL 1.1"></a>
</p>

<p align="center"><a href="README.md">English</a> · ไทย</p>

<p align="center"><img src="docs/images/tour.gif" width="800" alt="ภาพรวมโปรแกรม: ฉากเปิด คลังเอฟเฟกต์ Quick Look และ Studio"></p>

## ทำอะไรได้

- เปิดมาเจอคลังเอฟเฟกต์ที่เล่นอยู่ 244 ตัว ใน 21 หมวด
- ปรับชุดสี ความเร็ว seed แสง และตัวเลือกต่างๆ ได้โดยไม่ต้องเขียนโค้ด
- แก้จังหวะตัวละครได้ ทั้งเตรียมท่า หยุดค้างตอนปะทะ และแรงสั่นจอ
- ติดเอฟเฟกต์กับสไปรต์ของคุณ และเพิ่มออร่า แสงเรือง แสงส่อง หรือการเปลี่ยนสีได้ทีละเฟรม
- อ่านคำสั่งง่ายๆ ทั้งไทยและอังกฤษ และแสดงคำที่ใช้ไม่ได้ให้เห็น
- ส่งออกเป็นสไปรต์ชีต + JSON, ชุดภาพ PNG, GIF, APNG และชุดพร้อมใช้ ZIP ได้ 1, 4, 8 หรือ 16 ทิศ พร้อม normal map
- ทำงานออฟไลน์ ไม่มีบัญชี ไม่มี API key และไม่มีการติดตาม

## ดาวน์โหลด

ดาวน์โหลดตัวติดตั้งจาก [Releases](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest) รุ่นนี้เป็น prerelease ที่ยังไม่ได้เซ็น macOS และ Windows จึงจะเตือนก่อนเปิด

## ทดสอบอะไรแล้วบ้าง

- Unit test และ end-to-end test ใน Electron บน macOS รวมถึงตรวจทั้ง 244 เอฟเฟกต์เทียบกับพิกเซลที่บันทึกไว้
- เปิดแอปที่แพ็กแล้วบน macOS และทดลองส่งออกจริง
- ยังไม่ได้ทดสอบ: Windows และ Linux บนเครื่องจริง การนำเข้าเอนจินเกมจริง การทดสอบกับผู้ใช้จริง และการตรวจภาษาไทยโดยผู้เชี่ยวชาญ

## การพัฒนา

```bash
npm ci
npm run dev
```

Electron อาจเปิดใน sandbox ของเครื่องมือเขียนโค้ดบางตัวไม่ได้ ให้รัน `npm run test:e2e` ในเทอร์มินัลปกติ

## เอกสารโครงการ

[สเปกผลิตภัณฑ์](docs/vfx-nexgerlab-product-spec.md) · [การตัดสินใจ](DECISIONS.md) · [Changelog](CHANGELOG.md) · [การมีส่วนร่วม](CONTRIBUTING.md) · [การแปล](docs/TRANSLATING.md) · [การปล่อยรุ่น](docs/RELEASING.md) · [ความปลอดภัย](SECURITY.md)

## กฎหมาย

โปรแกรมนี้ใช้ Business Source License 1.1 ใช้ทำเกมได้ รวมถึงเกมที่ขาย และไฟล์ที่ส่งออกเป็นของคุณ แต่ห้ามขายตัวโปรแกรม ให้บริการแบบเก็บเงิน หรือสร้างเครื่องมือคู่แข่ง แต่ละเวอร์ชันจะเปลี่ยนเป็น Apache-2.0 เมื่อครบสี่ปีหลังเผยแพร่ โครงการนี้เปิดซอร์ส แต่ไม่ใช่โอเพนซอร์สตามนิยาม OSI

เอนจินและคลังเอฟเฟกต์ใน `src/engine/pixelfx/` มาจาก [pixelfx](https://github.com/patch-gg/pixelfx) ของ Patch และยังเป็น MIT License ดู[ประกาศบุคคลที่สาม](THIRD_PARTY_NOTICES.md)

## ผู้สร้าง

<a href="https://github.com/NexwestLedgerCoreCompanyLimited"><img src="https://github.com/NexwestLedgerCoreCompanyLimited.png" width="64" alt="Nai Natthawut"></a>

Nai Natthawut, NEXWEST LEDGER CORE COMPANY LIMITED
