from pathlib import Path
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
import re,html,subprocess,shutil
p=Path(__file__).resolve().parents[1]
for name,file in [('DV','DejaVuSans.ttf'),('DVB','DejaVuSans-Bold.ttf')]:pdfmetrics.registerFont(TTFont(name,str(p/'docs/fonts'/file)))
pdfmetrics.registerFontFamily('DV',normal='DV',bold='DVB',italic='DV',boldItalic='DVB')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body',fontName='DV',fontSize=9.3,leading=14,spaceAfter=9,textColor=colors.HexColor('#303830')))
styles.add(ParagraphStyle(name='H1x',fontName='DVB',fontSize=19,leading=24,spaceBefore=20,spaceAfter=13,textColor=colors.HexColor('#173d30'),keepWithNext=True))
styles.add(ParagraphStyle(name='H2x',fontName='DVB',fontSize=13,leading=18,spaceBefore=15,spaceAfter=10,textColor=colors.HexColor('#173d30'),keepWithNext=True))
styles.add(ParagraphStyle(name='Cell',fontName='DV',fontSize=8,leading=11,spaceAfter=0))
styles.add(ParagraphStyle(name='Cover',fontName='DVB',fontSize=40,leading=45,textColor=colors.HexColor('#173d30'),spaceAfter=20))
styles.add(ParagraphStyle(name='CodeX',fontName='DV',fontSize=8,leading=12,backColor=colors.HexColor('#f1f3ed'),borderPadding=9,spaceAfter=12))
def fmt(t):
 t=html.escape(t).replace('&lt;br/&gt;','<br/>')
 t=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',t)
 t=re.sub(r'`([^`]+)`',r'\1',t)
 # URLs are shown as line-wrap-friendly plain labels, with actual target preserved.
 t=re.sub(r'https://[^\s<]+',lambda m:'<link href="'+m.group(0).rstrip(').;,')+'" color="#174f65">'+m.group(0).rstrip(').;,').replace('/', '/<wbr/>')+'</link>'+m.group(0)[len(m.group(0).rstrip(').;,')):],t)
 return t
story=[]
def para(t,sty='Body'):return Paragraph(fmt(t),styles[sty])
def table(lines):
 rows=[[c.strip() for c in l.strip().strip('|').split('|')] for l in lines]
 rows=[r for r in rows if not all(re.fullmatch(r':?-+:?',c) for c in r)]
 n=len(rows[0]);width=483/n
 cells=[[para(c,'Cell') for c in r] for r in rows]
 t=Table(cells,colWidths=[width]*n,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e5ece1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f6f7f3')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,0),1,colors.HexColor('#b8c7b2'))]))
 story.extend([t,Spacer(1,12)])
def md(txt):
 lines=txt.splitlines();i=0;buf=[]
 def flush():
  if buf:story.append(para(' '.join(buf)));buf.clear()
 while i<len(lines):
  l=lines[i]
  if l.startswith('|'):
   flush();arr=[]
   while i<len(lines) and lines[i].startswith('|'):arr.append(lines[i]);i+=1
   table(arr);continue
  if l.startswith('```'):
   flush();i+=1;code=[]
   while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
   story.append(Paragraph('<br/>'.join(html.escape(x).replace(' ','&nbsp;') for x in code),styles['CodeX']))
  elif l.startswith('# '):flush();story.append(para(l[2:],'H1x'))
  elif l.startswith('## '):flush();story.append(para(l[3:],'H2x'))
  elif not l.strip():flush()
  elif l.startswith('- '):flush();story.append(para('• '+l[2:]))
  else:buf.append(l.strip())
  i+=1
 flush()
# Cover
story += [Spacer(1,45),para('DESARROLLO WEB BACKEND · IFTS 29','H2x'),Spacer(1,25),para('SumarImpacto','Cover'),para('Tercera entrega · Documentación técnica','H1x'),para('Jonatan Emanuel Uribio<br/>Grupo 34 · Comisión 2C<br/>14 de noviembre de 2026'),Spacer(1,25)]
cover=Table([[para('Versión 3.1.0\nNode.js · Express · MongoDB · Mongoose')],[para('Estado: código y prueba integral preparados. Antes de entregar: configurar Atlas, publicar, grabar video y completar enlaces definitivos.')]],colWidths=[483]);cover.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#eef2e7')),('BOX',(0,0),(-1,-1),1,colors.HexColor('#c5d3b8')),('LEFTPADDING',(0,0),(-1,-1),18),('TOPPADDING',(0,0),(-1,-1),15),('BOTTOMPADDING',(0,0),(-1,-1),12)]));story.extend([cover,Spacer(1,24),para('Contenido: objetivos y alcance; RF/RNF; reglas de negocio; arquitectura y validaciones; modelo de datos; pruebas; mantenimiento; responsabilidad individual; bibliografía; matriz de versiones y tecnologías; ejecución y defensa.'),PageBreak()])
md((p/'docs/ENLACES_ENTREGA.md').read_text(encoding='utf-8'))
md((p/'docs/DOCUMENTACION.md').read_text(encoding='utf-8'))
story.append(PageBreak());md((p/'docs/MATRIZ_VERSIONES.md').read_text(encoding='utf-8'))
story.append(PageBreak());md((p/'docs/PRUEBAS.md').read_text(encoding='utf-8'))
# Real vector diagram generated as bitmap for PDF embedding.
dot='''digraph G { rankdir=TB; graph [bgcolor="white",nodesep=.5,ranksep=.6]; node [shape=box,style="rounded,filled",fontname="DejaVu Sans",fillcolor="#edf2e7",color="#557758",fontsize=12]; edge [fontname="DejaVu Sans",fontsize=10,color="#557758"]; O[label="Organización\\nnombre · descripción · contacto"]; P[label="Proyecto\\norganizacion_id · objetivo_monto"]; D[label="Donante\\nnombre · email · teléfono"]; A[label="Donación\\ndonante_id · proyecto_id opcional\\nmonto · fecha"]; G[label="Gasto\\nproyecto_id · concepto\\nmonto · fecha"]; U[label="Usuario\\nemail único · passwordHash · rol",fillcolor="#ffefe1"]; O->P[label="1 a muchos"]; P->A[label="0/1 proyecto por donación"]; D->A[label="1 a muchos"]; P->G[label="1 a muchos"]; {rank=same;O;D;U} }'''
(p/'docs/modelo.dot').write_text(dot,encoding='utf-8')
if shutil.which('dot'): subprocess.run(['dot','-Tpng','-Gdpi=160',str(p/'docs/modelo.dot'),'-o',str(p/'docs/modelo.png')],check=True)
from PIL import Image as PILImage
im=PILImage.open(p/'docs/modelo.png'); iw,ih=im.size
story.extend([PageBreak(),para('Modelo de datos y recorrido HTTP','H1x'),Image(str(p/'docs/modelo.png'),width=483,height=483*ih/iw),para('Las referencias se comprueban en los controladores. Usuario autoriza operaciones; no existe autor_id de movimientos ni auditoría por usuario.'),para('Secuencia de registro de gasto','H2x'),para('1. Navegador envía POST /api/gastos en JSON. 2. Middleware valida origen, token y rol. 3. Controlador inicia una transacción y escribe ControlFinanciero. 4. Verifica monto y proyecto. 5. Consulta donaciones y gastos con Mongoose. 6. Si el monto supera el saldo, responde 400 sin guardar. 7. Si es válido, crea el gasto, confirma la transacción y responde 201.'),para('Los diagramas editables de relaciones, casos de uso y secuencia están en docs/DIAGRAMAS.md. Las transacciones coordinan entre procesos; no cubren escrituras externas.')])
story.append(PageBreak());md((p/'docs/GUION_BASE_10_MINUTOS.md').read_text(encoding='utf-8'))
story.append(PageBreak());md((p/'docs/DESPLIEGUE.md').read_text(encoding='utf-8'))
story.append(PageBreak());md((p/'docs/CHATBOT.md').read_text(encoding='utf-8'))
def footer(c,d):
 c.setStrokeColor(colors.HexColor('#d6decf'));c.line(56,45,539,45);c.setFont('DV',8);c.setFillColor(colors.HexColor('#65705e'));c.drawString(56,31,'SumarImpacto · Grupo 34 · Jonatan Emanuel Uribio');c.drawRightString(539,31,str(d.page))
path=p/'docs/SumarImpacto_Grupo34_Tercera_Entrega.pdf'
SimpleDocTemplate(str(path),pagesize=(595.28,841.89),rightMargin=56,leftMargin=56,topMargin=45,bottomMargin=61,title='SumarImpacto · Tercera entrega · Grupo 34',author='Jonatan Emanuel Uribio').build(story,onFirstPage=footer,onLaterPages=footer)
print(path)
