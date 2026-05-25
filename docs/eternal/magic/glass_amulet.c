
// Second chance amulet.  Saves your life onces.

inherit "/obj/armor/armor/special/base_amulet";
inherit IdentifyCode;

object	shadobj, player;
int worn;
#define SHADOW_OB "/zone/null/eternal/magic/glass_amulet_shadow"

void extra_create()
{
    set_name("glass amulet");
    add_alias("glass");
    add_alias("amulet");
    add_alias("amulet");
    set_short("a glass amulet");
    set_id_short("a second chance amulet");
    set_id_long(
      "This amulet is a blown glass globe with a glowing red mist inside.\n"+
      "If you are wearing it, it will prevent your death.\n"
    );
    set( MagicP, 1 );
    set_long(
      "This amulet is a blown glass globe with a glowing red mist inside.\n"
    );
    set_value(8000);
    set_weight(5);
}

wear_comm(wearer)
{
    if (catch (shadobj = clone_object(SHADOW_OB)))
    {
	write("There was an error with the amulet shadow.  Doh!\n");
	write("The amulet disappears in a puff of logic!\n");
	destruct(THISO);
	return;
    }
    shadobj->set_up_effect(wearer,THISO);
    player=wearer;
    worn=1;
}

remove_comm(wearer)
{
    if(!shadobj)
    {
	write("You have no effects shadow! Strange...\n");
    }
    else 
    {
	shadobj->remove_effect();
    }
    player=0;
    worn=0;
}

destruct_signal()
{
    if (shadobj) catch(shadobj->remove_effect());
}

shatter()
{
    shadobj->unshadow();
    destruct(THISO);
}
