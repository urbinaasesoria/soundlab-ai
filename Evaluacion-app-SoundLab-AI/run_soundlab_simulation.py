# -*- coding: utf-8 -*-
"""
Orquestador de Simulación y Evaluación Mirofish para:
SoundLab AI — Copiloto y Suite de Producción Musical Asistida por IA
(https://soundlab-ai-app.vercel.app/) - Desarrollado por URBINA ASESORÍA E INVERSIONES S.A.C.
"""
import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Salida UTF-8 para Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

os.environ['DEFAULT_LOCALE'] = 'es'

BASE_URL = "http://localhost:5001"
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "evaluations", "app-SoundLab-AI")
SEED_DOC_PATH = os.path.join(OUTPUT_DIR, "seed_document.md")

simulation_requirement = (
    "Predecir la viabilidad comercial, adopción de usuarios, conversión web (CRO), percepción de precios "
    "(Pro Mensual S/ 35 / $9.90 vs Pro Anual S/ 249 / $69 vs Packs de Créditos Starter S/ 15 / $4.90 a Label S/ 149 / $49), "
    "reacción de creadores y productores musicales que usan Suno (v3.5/v4) y Udio (v1.5), "
    "ingenieros de sonido escépticos, agencias de marketing y beatmakers, "
    "fricciones de pago en checkout (Yape/Plin en Perú vs Tarjetas de crédito / PayPal en el extranjero), "
    "valoración de la privacidad 100% soberana en navegador mediante Web Audio API (cero subida de audios a servidores externos), "
    "impacto de los presets culturales peruanos (Cumbia Chicha, Sanjuanera, Cumbia Norteña) y géneros globales, "
    "utilidad del Escudo Protector SHA-256 para reclamos de autoría y derechos de distribución, "
    "y recomendaciones de crecimiento, adquisición de usuarios y optimización del embudo para SoundLab AI (https://soundlab-ai-app.vercel.app/)."
)

print("="*70)
print("INICIANDO EVALUACIÓN MIROFISH: SoundLab AI (https://soundlab-ai-app.vercel.app/)")
print("="*70)

# ----------------------------------------------------
# PASO 1: Subir archivos y generar Ontología
# ----------------------------------------------------
print("\n[Paso 1/6] Subiendo seed_document.md y analizando ontología...")
with open(SEED_DOC_PATH, "rb") as f:
    files = [("files", ("seed_document.md", f, "text/markdown"))]
    data = {
        "simulation_requirement": simulation_requirement,
        "project_name": "SoundLab AI - Copiloto Musical Suno Udio",
        "additional_context": "Suite de producción musical asistida por IA para Suno y Udio con análisis de loudness BS.1770, DSP analógico local, presets de géneros (chicha, sanjuanera, pop, trap), privacidad 100% en navegador y sello SHA-256 (URBINA ASESORÍA E INVERSIONES S.A.C.)."
    }
    ont_res = requests.post(f"{BASE_URL}/api/graph/ontology/generate", files=files, data=data, timeout=180)

if ont_res.status_code != 200:
    print(f"Error generando ontología: {ont_res.status_code} - {ont_res.text}")
    sys.exit(1)

ont_json = ont_res.json()
if not ont_json.get("success"):
    print(f"Fallo en ontología: {ont_json}")
    sys.exit(1)

project_id = ont_json["data"]["project_id"]
ontology = ont_json["data"]["ontology"]
print(f"-> Proyecto creado con ID: {project_id}")
print(f"-> Tipos de entidad: {[e['name'] for e in ontology.get('entity_types', [])]}")

with open(os.path.join(OUTPUT_DIR, "ontology.json"), "w", encoding="utf-8") as f:
    json.dump(ontology, f, ensure_ascii=False, indent=2)

# ----------------------------------------------------
# PASO 2: Construir Grafo en Zep
# ----------------------------------------------------
print(f"\n[Paso 2/6] Construyendo grafo de conocimiento en Zep...")
build_res = requests.post(f"{BASE_URL}/api/graph/build", json={"project_id": project_id}, timeout=60)
if build_res.status_code != 200:
    print(f"Error iniciando build: {build_res.text}")
    sys.exit(1)

build_data = build_res.json()
task_id = build_data["data"]["task_id"]
print(f"-> Tarea de construcción: {task_id}. Esperando indexación en Zep...")

graph_id = None
max_build_wait = 300
start_build = time.time()
while time.time() - start_build < max_build_wait:
    t_res = requests.get(f"{BASE_URL}/api/graph/task/{task_id}", timeout=30)
    if t_res.status_code == 200:
        t_data = t_res.json()
        t_info = t_data.get("data", {})
        status = t_info.get("status")
        progress = t_info.get("progress", 0)
        msg = t_info.get("message", "")
        print(f"   [Grafo Zep] Estado: {status} ({progress}%) - {msg}")
        if status in ["completed", "success"]:
            p_res = requests.get(f"{BASE_URL}/api/graph/project/{project_id}", timeout=30)
            graph_id = p_res.json().get("data", {}).get("graph_id")
            break
        elif status == "failed":
            print(f"Error construyendo grafo: {t_info.get('error')}")
            sys.exit(1)
    time.sleep(7)

if not graph_id:
    p_res = requests.get(f"{BASE_URL}/api/graph/project/{project_id}", timeout=30)
    graph_id = p_res.json().get("data", {}).get("graph_id")

print(f"-> Grafo Zep listo: {graph_id}")

# ----------------------------------------------------
# PASO 3: Crear Simulación Social
# ----------------------------------------------------
print(f"\n[Paso 3/6] Creando simulación social dual (Twitter + Reddit)...")
create_res = requests.post(
    f"{BASE_URL}/api/simulation/create",
    json={
        "project_id": project_id,
        "graph_id": graph_id,
        "enable_twitter": True,
        "enable_reddit": True
    },
    timeout=60
)
if create_res.status_code != 200:
    print(f"Error creando simulación: {create_res.text}")
    sys.exit(1)

sim_data = create_res.json().get("data", {})
simulation_id = sim_data.get("simulation_id")
print(f"-> Simulación creada: {simulation_id}")

# ----------------------------------------------------
# PASO 4: Preparar Entorno OASIS (Perfiles y Configuración)
# ----------------------------------------------------
print(f"\n[Paso 4/6] Generando perfiles de agentes y configuración inteligente OASIS...")
prep_res = requests.post(
    f"{BASE_URL}/api/simulation/prepare",
    json={
        "simulation_id": simulation_id,
        "use_llm_for_profiles": True,
        "parallel_profile_count": 5
    },
    timeout=60
)
if prep_res.status_code != 200:
    print(f"Error preparando simulación: {prep_res.text}")
    sys.exit(1)

max_prep_wait = 450
start_prep = time.time()
while time.time() - start_prep < max_prep_wait:
    s_res = requests.post(
        f"{BASE_URL}/api/simulation/prepare/status",
        json={"simulation_id": simulation_id},
        timeout=30
    )
    if s_res.status_code == 200:
        s_data = s_res.json().get("data", {})
        status = s_data.get("status")
        progress = s_data.get("progress", 0)
        msg = s_data.get("message", "")
        print(f"   [Preparación OASIS] Estado: {status} ({progress}%) - {msg}")
        if status in ["ready", "completed"]:
            break
        elif status == "failed":
            print(f"Error preparando OASIS: {msg}")
            sys.exit(1)
    time.sleep(10)

# ----------------------------------------------------
# PASO 5: Iniciar Simulación OASIS
# ----------------------------------------------------
print(f"\n[Paso 5/6] Iniciando simulación OASIS...")
start_sim_res = requests.post(
    f"{BASE_URL}/api/simulation/start",
    json={"simulation_id": simulation_id},
    timeout=60
)
if start_sim_res.status_code != 200:
    print(f"Error iniciando OASIS: {start_sim_res.text}")
    sys.exit(1)

print(f"-> Simulación en marcha. Monitoreando rondas y volumen de acciones...")
max_sim_wait = 900
start_sim = time.time()
while time.time() - start_sim < max_sim_wait:
    r_res = requests.get(f"{BASE_URL}/api/simulation/{simulation_id}/run-status", timeout=30)
    if r_res.status_code == 200:
        r_data = r_res.json().get("data", {})
        runner_status = r_data.get("runner_status")
        current_round = r_data.get("current_round", 0)
        total_actions = r_data.get("total_actions_count", 0)
        print(f"   [OASIS Enjambre] Estado: {runner_status} | Ronda: {current_round} | Acciones: {total_actions}")
        # Si ya completó 15 rondas o más de 110 acciones, detener para consolidar
        if runner_status in ["completed", "stopped"] or (current_round >= 15 and total_actions >= 100):
            print(f"-> Criterio alcanzado ({current_round} rondas, {total_actions} acciones). Deteniendo simulación...")
            requests.post(f"{BASE_URL}/api/simulation/stop", json={"simulation_id": simulation_id}, timeout=30)
            break
    time.sleep(12)

time.sleep(5)
print("-> Cerrando entorno de simulación para liberar recursos...")
requests.post(f"{BASE_URL}/api/simulation/close-env", json={"simulation_id": simulation_id}, timeout=30)

# ----------------------------------------------------
# PASO 6: Generar Reporte con ReportAgent (Español)
# ----------------------------------------------------
print(f"\n[Paso 6/6] Iniciando ReportAgent con ReACT (Idioma: Español)...")
rep_res = requests.post(
    f"{BASE_URL}/api/report/generate",
    json={
        "simulation_id": simulation_id,
        "requirement": simulation_requirement
    },
    timeout=60
)
if rep_res.status_code != 200:
    print(f"Error solicitando reporte: {rep_res.text}")
    sys.exit(1)

report_id = rep_res.json().get("data", {}).get("report_id") or rep_res.json().get("report_id")
print(f"-> ReportAgent ejecutando análisis. Report ID: {report_id}")

max_rep_wait = 900
start_rep = time.time()
while time.time() - start_rep < max_rep_wait:
    chk_res = requests.get(f"{BASE_URL}/api/report/{report_id}", timeout=30)
    if chk_res.status_code == 200:
        cdata = chk_res.json().get("data", {})
        status = cdata.get("status")
        md = cdata.get("markdown_content", "")
        print(f"   [ReportAgent ReACT] Estado: {status} | Contenido actual: {len(md)} chars")
        if status in ["completed", "success"] and len(md) > 1000:
            print("-> Reporte completado y validado.")
            break
    time.sleep(15)

# Descargar y guardar el reporte final
print("\nDescargando reporte consolidado final...")
final_res = requests.get(f"{BASE_URL}/api/report/{report_id}", timeout=60)
if final_res.status_code == 200:
    final_data = final_res.json().get("data", {}) or final_res.json()
    content = final_data.get("markdown_content", "") or final_data.get("content", "")
    
    rep_path = os.path.join(OUTPUT_DIR, "soundlab_final_report.md")
    with open(rep_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    raw_path = os.path.join(OUTPUT_DIR, "report_data.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
        
    print(f"\n============================================================")
    print(f"¡REPORTE SOUNDLAB AI COMPLETADO EXITOSAMENTE!")
    print(f"Guardado en: {rep_path}")
    print(f"Longitud: {len(content)} caracteres.")
    print(f"============================================================")
else:
    print(f"Error al descargar reporte final: {final_res.text}")

