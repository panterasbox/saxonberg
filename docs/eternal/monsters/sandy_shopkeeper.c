/* Sandy the Shopkeeper */
/* Little Mod by Min, etc */

#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;

inherit SpecialAttackCode;

#include "path.h"
#include "monster.h"

void extra_create()
{
    set_name("sandy");
    add_alias("Sandy");
    add_alias("shopkeeper");
    set_short("Sandy, the customer service agent");
    set_long("This is a short, dwarven woman in her younger middle ages.  She is\n" +
      "wearing a red uniform with the words 'Everything Inc.' across the back,\n" +
      "and a nametag on the front that has her name, 'Sandy', printed on it.\n" +
      "She smiles at you and says 'Need help finding anything?'\n");
    set_race("dwarf");
    set_alignment(30);
    set_type("blunt");
    set_toughness( 35 );
    add_special_attack("Outem", THISO, 10);
    set( FundsP, 100000 );
}
query_attacks() {
    return 4;
}
Outem(object victim) {
    object *inv;
    object wun,tue;
    int i;
    inv = inventorya(victim);
    inv = filter_array(inv, "Icheck");
    if(sizeof(inv) < 2) {
	Throw_Out(victim);
	return 1;
    }
    i = random(sizeof(inv));
    wun = inv[i];
    if(move_object(wun, present("sign", ENV(THISO)))) {
	tell_object(victim, strformat("Sandy snorts.\nSandy says: Enough of "
	    "this Bullshit.\nSandy grabs your "+wun->query("name")+"!\n"
	    "Sandy says: You probably shoplifted that!"));
	tell_room(ENV(THISO), strformat("Sandy snorts.\nSandy says: Enough of "
	    "this Bullshit.\nSandy grabs something from "+victim->query_name()+"!\n"
	    "Sandy says: You probably shoplifted that!"),({victim}));
	inv -= ({wun});
    }
    i = random(sizeof(inv));
    tue = inv[i];
    if(move_object(tue, present("sign", ENV(THISO)))) {
	tell_object(victim, strformat("Sandy says: This is mine now!\n"
	    "Sandy takes your "+tue->query("name")+"!"));
	tell_room(ENV(THISP), strformat("Sandy says: This is mine now!\n"
	    "Sandy takes something from "+victim->query_name()+"!"),({victim}));
    }
    Throw_Out(victim);
    return 1;
}

Throw_Out(object victim) {
    tell_object(victim, strformat("Sandy throws you out of the store!"));
    tell_room(ENV(THISO), strformat("Sandy throws "+victim->query_name()+
	" out of the store!"),({victim}));
    move_object(victim, "/zone/null/eternal/room017");
    command("glance", victim);
}

Icheck(object ob) {
    if(!ob->query("short")) return 0;
    if(ob->query("wielded")) return 0;
    if(ob->query(NoSellP)) return 0;
    if(ob->query(InvisP)) return 0;
    else return 1;
}
