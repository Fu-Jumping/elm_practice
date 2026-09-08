package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.AddressMapper;
import com.elm.practice.dto.Requests;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AddressService {
    private final AddressMapper addresses; private final IdGenerator ids;
    public AddressService(AddressMapper addresses, IdGenerator ids) { this.addresses = addresses; this.ids = ids; }

    public List<Map<String,Object>> list(Domain.User u) {
        return addresses.listByUser(u.id).stream().map(ViewMapper::address).toList();
    }

    public Domain.Address get(Domain.User u, String id) {
        Domain.Address a = addresses.findById(id);
        if (a == null || !a.userId.equals(u.id)) throw ApiException.notFound("地址不存在"); return a;
    }

    @Transactional
    public Domain.Address create(Domain.User u, Requests.AddressRequest r) {
        validate(r);
        // 首条地址强制默认；isDefault=true 时先清旧默认（同一事务内保证唯一默认）。
        boolean makeDefault = Boolean.TRUE.equals(r.isDefault) || addresses.countByUser(u.id) == 0;
        if (makeDefault) addresses.clearDefaultForUser(u.id);
        Domain.Address a = new Domain.Address(ids.nextId("da"), u.id, r.contactName.trim(),
                r.contactSex == null ? "" : r.contactSex.trim(), r.contactPhone.trim(), r.region.trim(),
                r.detail.trim(), r.label == null ? "" : r.label.trim(), makeDefault, LocalDateTime.now());
        addresses.insert(a);
        return a;
    }

    @Transactional
    public Domain.Address patch(Domain.User u, String id, Requests.AddressRequest r) {
        Domain.Address a = get(u, id);
        if (r.contactName != null) a.contactName = RequestUtil.required(r.contactName, "contactName");
        if (r.contactSex != null) a.contactSex = r.contactSex.trim();
        if (r.contactPhone != null) {
            if (!r.contactPhone.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("contactPhone必须是 11 位手机号");
            a.contactPhone = r.contactPhone.trim();
        }
        if (r.region != null) a.region = RequestUtil.required(r.region, "region");
        if (r.detail != null) a.detail = RequestUtil.required(r.detail, "detail");
        if (r.label != null) a.label = r.label.trim();
        if (Boolean.TRUE.equals(r.isDefault)) { addresses.clearDefaultForUser(u.id); a.isDefault = true; }
        a.updatedAt = LocalDateTime.now();
        addresses.updateFull(a);
        return a;
    }

    @Transactional
    public void delete(Domain.User u, String id) {
        Domain.Address a = get(u, id);
        addresses.delete(id);
        if (a.isDefault) {
            Domain.Address recent = addresses.firstByRecent(u.id);
            if (recent != null) { recent.isDefault = true; addresses.updateFull(recent); }
        }
    }

    private void validate(Requests.AddressRequest r) {
        if (r == null) throw ApiException.badRequest("请求体不能为空");
        RequestUtil.required(r.contactName, "contactName");
        if (r.contactPhone == null || !r.contactPhone.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("contactPhone必须是 11 位手机号");
        RequestUtil.required(r.region, "region");
        RequestUtil.required(r.detail, "detail");
    }
}
