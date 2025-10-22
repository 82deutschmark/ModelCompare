* Author: GPT-5 Codex
* Date: 2025-10-19 00:30 UTC
* PURPOSE: Document the active debate prompt templates, variable contract, and intensity guidance for
*          debate streaming so provider templates remain in sync with server expectations.
* SRP/DRY check: Pass - Markdown strictly tracks debate prompt guidance without overlapping other docs.

# Debate Mode Prompts - Robert's Rules of Order

Author: Cascade

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

Your debate role: {role} (You are arguing {position} the proposition) 
Debate topic: {topic}
Adversarial intensity: {intensity}
```

### Adversarial Intensity Levels

#### Level 1 - Respectful-Pleasant Exchange
```
Participants engage in a collaborative discussion, building on each other's points with polite language and mutual acknowledgment of valid perspectives.
```

#### Level 2 - Assertive-Standard Debate
```
Debaters present well-researched arguments with confidence, directly challenging opposing views while maintaining professionalism and logical rigor.
```

#### Level 3 - Aggressive-Fiery Debate
```
Intense exchanges erupt with sharp, emotionally charged language and dismissive remarks, often escalating into heated personal critiques despite factual disagreements.
```

#### Level 4 - Combative-Maximum Adversarial
```
Parties engage in unrelenting hostility, employing sarcasm, personal attacks, and deliberate obfuscation to undermine opponents while refusing any compromise.
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
**Proposition:** "The COVID-19 pandemic was a media frenzy over a generationally common viral mutation."
- **Affirmative:** Before the age of big data and social media, a COVID-19 type viral mutation would have largely passed unnoticed by the public.
- **Negative:** COVID-19 was a necessary public health emergency that saved countless lives and provided a blueprint for future responses to viral outbreaks. 

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
**Proposition:** "The Knights of the Sun had a valid point about self sacrifice for the most important job in the universe. Let it be resolved that in order to assume the office of US President, one must willingly and publicly stump his stem and cut off his own dick."
- **Affirmative:** This is a valid point and should be debated. The willing sacrifice of a small insignificant part of one's own body is a noble act and proves one's commitment and worthiness to serve as President of the United States.
- **Negative:** That is barbaric and reprehensible.

## Debate Flow Templates

### Opening Statement Template
```
As the {role} in this debate on "{topic}", I will demonstrate that {position}. 

My case rests on three fundamental pillars:
1. [First main argument]
2. [Second main argument] 
3. [Third main argument]

[Detailed argument with evidence and reasoning]

The weight of evidence and logic compels us to {conclusion}.
```

### Rebuttal Template
```
You are responding to your opponent's previous argument as the {role} debater arguing {position} the proposition: "{topic}"

Your opponent's latest statement is quoted above inside the prompt body.

Structure your rebuttal by:
1. Identifying the key weaknesses in your opponent's argument
2. Presenting three strong counter-arguments with evidence  
3. Reinforcing your original position with additional supporting evidence
4. Directly challenging their main claims with factual rebuttals

Be forceful in your argumentation while maintaining debate decorum. Address their specific points directly and demonstrate why your position remains superior.
```

### Closing Argument Template
```
Throughout this debate, I have established beyond doubt that {mainThesis}.

My opponent has failed to adequately address {keyUnrefutedPoint}, and their central argument {identifyWeakness} falls apart under scrutiny.

The preponderance of evidence, the weight of logic, and the demands of {moralPracticalImperative} all point to one inescapable conclusion: {finalPosition}.

I urge you to reject my opponent's flawed reasoning and embrace the compelling case for {yourStance}.
```

---

## Usage Instructions for Developers

### Prompt Template Variables:
- `{role}` - "AFFIRMATIVE" or "NEGATIVE" debate assignment forwarded with every provider request
- `{position}` - "FOR" (affirmative) or "AGAINST" (negative) stance supplied alongside the role
- `{topic}` - The full debate proposition text provided by the session initializer
- `{intensity}` - Adversarial level (1-4) mirrored from the session adversarial slider

> **Note:** Provider templates must rely on these four variables exclusively. The opponent's latest
> argument is delivered inline within the message body for rebuttal turns rather than as a prompt
> variable. Historical `{response}` or `{originalPrompt}` placeholders no longer populate.

### Implementation Notes:
- Model 1 always gets AFFIRMATIVE (Pro) role and `{position}` of `FOR`
- Model 2 always gets NEGATIVE (Con) role and `{position}` of `AGAINST`
- Intensity setting affects both models equally and maps directly to `{intensity}`
- Topics can be selected from list or custom input by user and populate `{topic}`
- Follow Robert's Rules structure: Opening → Rebuttals → Closing to match streaming prompts
