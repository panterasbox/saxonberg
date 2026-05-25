/* Kalar's Brother, Kilbor the Shopkeeper */
/* Min, etc */
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
#include "monster.h"
 
#include "path.h"
 
void extra_create()
{
    set_name("kilbor");
    add_alias("Kilbor");
    add_alias("shopkeeper");
    set_short("Kilbor, the bomb freak");
    set_long(
      "This is Kilbor, Kalar's wild brother.  Having just gotten out "
      "of being in jail for sending letterbombs, he appealed to his "
      "big brother Kalar for a job.  Kalar's in Hawaii, with Kilbor "
      "minding the shop.  Kilbor has approximately 30 pounds of TNT "
      "strapped to his body, and is fingering a dead-man's switch.");
    set_race("imp");
    set_alignment(-30);
    set_type("blunt");
    set_toughness( 20 );
    add_prop( NoCharmP );
    set("MugResultP", "Bume");
}
 
DeathSequence(object killer, string cause) {
    if(killer && killer  != THISO)
        Bume();
    ::DeathSequence(killer, cause);
}
 
Bume() {
    object *inv;
    int damage, i;
    tell_room(ENV(THISO), strformat("Kilbor says: Hahaha... I'll have "
        "the last laugh you bastard!\nKilbor drops the stick, and the "
        "world goes white!"));
    inv = inventorya(ENV(THISO));
    damage = random(1000) + 250;
    for(i=0;i<sizeof(inv);i++) {
        if(living(inv[i]) && inv[i] != THISO)
            inv[i]->take_damage(damage, 0, "explosion", THISO, THISO);
    }
}
