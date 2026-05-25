// Death - 03/27/94
// Iron ring.  Based on the code from entesia's ring of strength but better
// in that it's only one object instead of two and cleaned up in other ways.
inherit ArmorCode;
inherit IdentifyCode;
inherit "/obj/armor/armor/special/base_ring";
// This is what the ring sets strength to.
#define STRENGTH 19
object str;

void extra_create()
{
    set_name("iron ring");
    add_alias("ring");
    set_short("an iron ring");
    set_id_short("A ring of limited strength");
    set_id_long(
      "Wearing this ring will make you fairly strong.  If you are stronger than\n"+
      "the ring however, it will weaken you.\n"
    );
    set_long(
      "This is a ring of cast iron.  It is warm when you hold it.\n"+
      "Inside the ring are inscribed some magical runes which you cannot\n"+
      "decipher.\n"
    );
    add_prop(RingP);
    add_prop(MagicP);
    add_prop(MetalP);
    set_weight(30);
    set_ac(0);
    add_prop(NoTemperP);
    add_prop(NoEnchantP);
    set_value(400);
}

void wear_comm(object wearer)
{
    wearer->add_bonus_object(THISO);
    if(environment()->query_base_stat("str")  > STRENGTH)
	write("You put on an iron ring and you suddenly feel weaker!\n");
    if(environment()->query_base_stat("str")  < STRENGTH)
	write("You put on an iron ring and you suddenly feel stronger!\n");
}

void remove_comm(object wearer)
{
    wearer->remove_bonus_object(THISO);
    write("You feel normal again after removing the ring.\n");
}


query_stat_bonus(arg)
{
    if (arg=="str") return STRENGTH - environment()->query_base_stat("str");
}
