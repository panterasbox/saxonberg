
inherit HealCode;

void setup_next_use()
{
    set_heal_hp_amount(5);
    set_heal_mana_amount(5);
    set_heal_ftg_amount(7);
}

void extra_create()
{
    set_name("pepsi");
    add_alias("can");
    add_alias("can of pepsi");
    add_alias("pepsi can");
    add_alias("soft drink");
    set_short("A can of Pepsi");
    set_id_short("A can of Pepsi");
    set_long("This is a can of Pepsi, use your imagination.\n");
    set_weight(20);
    set_value(50);
    setup_next_use();
    set_heal_uses(1);
    set_heal_action("drink");
    set_action_msg("Ahh! Refreshing!\n",
                   PNAME + " drinks something and looks refreshed!\n");
    add_property("magic");
}

void init(){
::init();
  add_action("cancrt","drink");
}
int cancrt(string arg){
  object can;

  if (!arg) {return 0;}
   if (!id(arg)){return 0;}
  can=clone_object("/zone/null/eternal/lounge/can");
  move_object(can,environment(THISO));
}
