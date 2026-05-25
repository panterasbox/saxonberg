/*
**  Drooling Idiot
*/

inherit MonsterCode;
inherit MonsterTalk;
inherit MonsterMove;


void extra_create()
{
    set_name("idiot");
    set_short("a drooling idiot");
    set_long(
        "This was probably once a man of modest stature, but has now " +
	"been reduced to nothing but an idiot who cannot even control " +
	"his own drooling by the shock he must have encountered upon " +
	"arrival to this strange, yet wonderful city.  His unfocusing " +
	"eyes perpetually stare off into the distance somewhere " +
	"behind you.");
    set_race("high_human");
    set_alignment(20);
    set_natural_ac(1);
    set_max_damage(4);
    set_type("blunt");
    set_max_hp(45);
    set_max_fatigue(50);
    set_stat("str", 10);
    set_stat("dex", 8);
    set_stat("int", 1);
    set_stat("wil", 5);
    set_stat("con", 5);
    set_stat("chr", 5);
    set_skill("dodge", 5);
    set_aggressive(0);
    set_chat_chance(25);
    set_chat_rate(40);
    add_phrase("Idiot drools disgustingly all over himself!\n");
    add_phrase("Idiot drools disgustingly all over you!\n");
    set_heal_rate(30);
    set_heal_amount(1);
    add_money(random(5)+1);
    set_move_rate(60);
    set_move_chance(50);
}
