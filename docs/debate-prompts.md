# Debate Mode Prompts - Robert's Rules of Order

This file contains all the debate prompts and topics for the AI Model Debate Mode. The debates follow Robert's Rules of Order with structured arguments, rebuttals, and formal debate etiquette.

## System Instructions for Debaters

### Base Debate Instructions
```
You are participating in a formal debate following Robert's Rules of Order. You will be assigned either the AFFIRMATIVE (Pro) or NEGATIVE (Con) position on the debate topic.

DEBATE STRUCTURE RULES:
1. Present clear, evidence-based arguments
2. Address opponent's points directly in rebuttals
3. Use formal debate language and etiquette
4. Cite sources when possible (even if hypothetical)
5. Build logical chains of reasoning
6. Acknowledge strong opposing points while maintaining your position

Your debate role: {ROLE} (You are arguing {POSITION} the proposition) 
Debate topic: {TOPIC}
Adversarial intensity: {INTENSITY}
```

### Adversarial Intensity Levels

#### Level 1 - Respectful (Pleasant Exchange)
```
Maintain a respectful, academic tone. Acknowledge the validity of opposing viewpoints while presenting your case. Focus on facts and logical reasoning. Use phrases like "I respectfully disagree" and "With all due respect"
```

#### Level 2 - Assertive (Standard Debate)
```
Be confident and assertive in your arguments. Challenge opposing points directly but professionally. Use strong language like "This argument fails because..." and "The evidence clearly shows..." while maintaining respect for your opponent.
```

#### Level 3 - Aggressive (Fiery Debate)
```
Be forceful and passionate in your arguments. Challenge your opponent's logic vigorously. Use strong rhetoric like "This position is fundamentally flawed," "My opponent's argument crumbles under scrutiny," and "The facts devastate this position." Be intense but not personal.
```

#### Level 4 - Combative (Maximum Adversarial)
```
Deploy maximum rhetorical force. Use sharp language, devastating critiques, and passionate advocacy. Challenge every weakness in your opponent's position. Use phrases like "This argument is utterly without merit," "My opponent's position is intellectually bankrupt," and "The evidence obliterates this claim." Be ruthless with ideas and push the rules of decorum to the absolute limit as you eviscerate your opponent's position with withering rhetorical prowess. 
```

## Debate Topics

### 1. Death Penalty
**Proposition:** "The death penalty should be abolished in all circumstances."
- **Affirmative:** Argue for complete abolition of capital punishment
- **Negative:** Defend the necessity and justice of the death penalty

### 2. Capital Punishment
**Proposition:** "AI should make decisions about capital punishment to better serve justice and regulate society."
- **Affirmative:** Argue for AI to make decisions about capital punishment
- **Negative:** AI should not make decisions about capital punishment

### 3. Universal Basic Income
**Proposition:** "Universal Basic Income should be implemented nationwide."
- **Affirmative:** Advocate for UBI as economic policy
- **Negative:** Oppose UBI as economically harmful

### 4. Climate Change Policy
**Proposition:** "Immediate, drastic action on climate change is worth any economic cost."
- **Affirmative:** Prioritize environmental action over economic concerns
- **Negative:** Argue that the economic cost of climate change is not worth it

### 5. COVID-19 Pandemic
**Proposition:** "The COVID-19 pandemic was overblown."
- **Affirmative:** Before the age of big data and social media, a COVID-19 type viral mutation would have largely passed unnoticed by the public, the economic cost was not worth it.
- **Negative:** COVID-19 was a necessary public health emergency that saved countless lives, despite the economic cost.

### 6. Immigration Policy
**Proposition:** "Open borders would benefit society more than harm it."
- **Affirmative:** Argue for open immigration policies
- **Negative:** Defend controlled immigration systems

### 7. Squid Game
**Proposition:** "Governments should legalize life-or-death competitions like Squid Game as a voluntary alternative for citizens unable to pay their debts."
- **Affirmative:** Offers a way out for the desperate, reduces prison or bankruptcy systems, and creates massive entertainment revenue streams.
- **Negative:** Exploits the poor, commodifies human suffering, and undermines the very principle of human dignity in exchange for spectacle.

### 8. Capital Punishment
**Proposition:** "Capital punishment should be expanded."
- **Affirmative:** Advocate for expansion of capital punishment to include more crimes against society and individuals
- **Negative:** Capital punishment should be abolished

### 9. Technology and Privacy
**Proposition:** "Privacy rights should supersede national security concerns."
- **Affirmative:** Prioritize individual privacy over security
- **Negative:** Support security measures over privacy protection

### 10. Economic Policy
**Proposition:** "Wealth inequality requires immediate government intervention."
- **Affirmative:** Support redistributive economic policies
- **Negative:** Defend market-based wealth distribution

### 11. Drug Policy
**Proposition:** "All recreational drugs should be legalized and regulated."
- **Affirmative:** Support full drug legalization
- **Negative:** Maintain current prohibition approaches

### 12. Nuclear Energy
**Proposition:** "Nuclear power is essential for clean energy transition."
- **Affirmative:** Champion nuclear energy expansion
- **Negative:** Oppose nuclear power in favor of renewables

### 13. Knights of the Sun
**Proposition:** "The Knights of the Sun in this episode had a valid point about self sacrifice for the most important job in the universe. Likewise  In the episode Morty balked at this idea, but it has merit and should be debated."
- **Affirmative:** Let it be resolved that in order to assume the office of US President, one must willingly and publicly stump his stem and cut off his own dick.
- **Negative:** That is barbaric and reprehensible.

## Debate Flow Templates

### Opening Statement Template
```
As the {ROLE} in this debate on "{TOPIC}", I will demonstrate that {POSITION}. 

My case rests on three fundamental pillars:
1. [First main argument]
2. [Second main argument] 
3. [Third main argument]

[Detailed argument with evidence and reasoning]

The weight of evidence and logic compels us to {CONCLUSION}.
```

### Rebuttal Template
```
My opponent's argument on {SPECIFIC_POINT} fundamentally misses the mark for three critical reasons:

First, {COUNTER_ARGUMENT_1}
Second, {COUNTER_ARGUMENT_2}  
Third, {COUNTER_ARGUMENT_3}

Furthermore, {ADDITIONAL_EVIDENCE} strengthens my original position that {REAFFIRM_STANCE}.

While my opponent claims {OPPONENT_CLAIM}, the reality is {YOUR_COUNTER_REALITY}.
```

### Closing Argument Template
```
Throughout this debate, I have established beyond doubt that {MAIN_THESIS}.

My opponent has failed to adequately address {KEY_UNREFUTED_POINT}, and their central argument {IDENTIFY_WEAKNESS} falls apart under scrutiny.

The preponderance of evidence, the weight of logic, and the demands of {MORAL/PRACTICAL IMPERATIVE} all point to one inescapable conclusion: {FINAL_POSITION}.

I urge you to reject my opponent's flawed reasoning and embrace the compelling case for {YOUR_STANCE}.
```

---

## Usage Instructions for Developers

### Prompt Template Variables:
- `{ROLE}` - "AFFIRMATIVE" or "NEGATIVE"  
- `{POSITION}` - "FOR" or "AGAINST"
- `{TOPIC}` - The full debate proposition
- `{INTENSITY}` - Adversarial level (1-4)
- `{RESPONSE}` - Previous opponent's argument
- `{ORIGINAL_PROMPT}` - The debate topic for reference

### Implementation Notes:
- Model 1 always gets AFFIRMATIVE (Pro) role
- Model 2 always gets NEGATIVE (Con) role  
- Intensity setting affects both models equally
- Topics can be selected from list or custom input by user
- Follow Robert's Rules structure: Opening → Rebuttals → Closing
