export const catalog:Record<string,string[]>={
'Cognitive / Neurological':['Brain fog','Slow processing','Difficulty understanding basic tasks','Word-finding difficulty','Losing track of identity or location','Overwhelm from simple decisions','Memory lapses','Difficulty sequencing steps'],
'Autonomic / Orthostatic':['Dizziness','Lightheadedness','Presyncope','Blood pressure instability','Heat intolerance','Cold intolerance','Air hunger','Nausea when upright','Fatigue after standing'],
'ME/CFS Energy Dysfunction':['Post-exertional malaise','Delayed crashes','Energy collapse','Inability to recover after exertion','Running-on-fumes sensation'],
'Hormonal / PMDD':['Irritability','Cognitive collapse around cycle','Pain sensitivity','Sleep disruption'],
'Autonomic Stress States':['Hypervigilance','Startle response'],
'Pain':['Muscle pain','Joint pain','Nerve pain','Headache','Eye pain','Pressure sensations','Skin pain / electric sensations'],
'Sensory Processing':['Light sensitivity','Sound sensitivity','Touch sensitivity','Visual distortion','Sensory overload','Dry eyes / inability to cry'],
'Gastrointestinal':['Nausea','Bloating','Cramping','Appetite swings','Constipation','Diarrhea'],
'Bladder / Urological':['Urgency','Frequency','Hesitancy','Bladder shutdown episodes','Bladder irritation','Low urine output despite intake'],
'Sleep':['Insomnia','Non-restorative sleep','Circadian disruption'],
'Environmental Reactivity':['Weather-triggered symptom spikes','Barometric pressure sensitivity','Heat/cold reactivity','Dehydration sensitivity'],
'Other Systemic':['Tremors','Weakness','Temperature dysregulation','Sweating abnormalities','Inflammation flares'],
'Immune and Healing':['Lower resistance to viral infections','Prolonged recovery from infections','Slow wound healing'],
'Chronic Nerve Injuries':['Right shoulder / upper back nerve pain','Occipital nerve pain','Thigh nerve pain','Foot nerve pain']};
export const allSymptoms=Object.values(catalog).flat();