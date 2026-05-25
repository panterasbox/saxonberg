/*
**  Tailor (Ten Second Tailors)
*/
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;

#include "monster.h"
#include "path.h"
 
void extra_create()
{
    set_name("quickfingers");
    add_alias("quickfinger");
    add_alias("halfling");
    add_alias("tailor");
    set_short("Quickfingers, the tailor, stands here waiting for a customer");
    set_long(
      "Before you stands a short, skinny halfling.  Oddly enough, the definition\n" +
      "in his muscles stands out as the most intriguing feature of the fellow;\n" +
      "thin, but hard.  Noticing your stare, he smiles and silently hopes that\n" +
      "you will request some of his services.\n"
    );
    set_race("halfling");
    set_alignment("good");
    set_toughness( 100 );
    set_max_hp(1000);
    set_max_fatigue(5000);
    add_combat_message("bash", "bashes");
}
